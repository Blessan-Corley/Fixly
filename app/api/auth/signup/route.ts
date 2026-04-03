import { getOptionalSession, parseBody, respond } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { getClientIp, isAllowedOrigin } from '@/lib/api/request';
import { normalizeEmail, normalizeIndianPhone } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { consumeOTPVerification, hasOTPVerification } from '@/lib/otpService';
import { authSlidingRateLimit, isAuthRedisDegraded } from '@/lib/redis';
import { signupApiSchema } from '@/lib/validations/auth';
import { GoogleAuthService } from '@/services/auth/googleService';
import { RegistrationService } from '@/services/auth/registrationService';

import { scheduleSignupEvent, validateSignupContent } from './helpers';

type SessionShape = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    authMethod?: string;
    isRegistered?: boolean;
  };
} | null;

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) return respond({ message: 'Forbidden' }, 403);

    const ip = getClientIp(request);
    const limit = await authSlidingRateLimit(`signup:${ip}`, 5, 3600);
    if (!limit.success) {
      if (limit.degraded) {
        return respond({ message: 'Signup is temporarily unavailable. Please try again shortly.' }, 503);
      }
      const retryAfter = Math.ceil(limit.retryAfter ?? 3600);
      return respond({ message: 'Too many signup attempts. Please try again later.' }, 429, {
        headers: { 'Retry-After': String(retryAfter) },
      });
    }

    const parsedBody = await parseBody(request, signupApiSchema);
    if ('error' in parsedBody) return parsedBody.error;
    const validData = parsedBody.data;

    if (validData.email) {
      const emailLimit = await authSlidingRateLimit(`signup_email:${validData.email}`, 5, 3600);
      if (!emailLimit.success && !emailLimit.degraded) {
        return respond(
          { message: 'Too many signup attempts for this email. Please try again later.' },
          429,
          { headers: { 'Retry-After': String(Math.ceil(emailLimit.retryAfter ?? 3600)) } }
        );
      }
    }

    if (validData.authMethod !== 'email' && validData.authMethod !== 'google') {
      return respond({ message: 'Unsupported authentication method' }, 400);
    }
    if (validData.termsAccepted !== true) {
      return respond({ message: 'You must accept the terms and conditions' }, 400);
    }

    const normalizedPhone = normalizeIndianPhone(validData.phone);
    if (!normalizedPhone) return respond({ message: 'A valid phone number is required' }, 400);

    const contentCheck = await validateSignupContent(
      validData.name,
      validData.username,
      validData.skills
    );
    if (!contentCheck.valid) {
      return respond({ message: contentCheck.message, suggestions: contentCheck.suggestions }, 400);
    }

    await connectDB();

    // Google Completion Flow
    if (validData.isGoogleCompletion) {
      const session = (await getOptionalSession()) as SessionShape;
      if (!session?.user) return respond({ message: 'Unauthorized' }, 401);
      if (session.user.authMethod !== 'google') {
        return respond({ message: 'Invalid Google signup session' }, 401);
      }
      if (session.user.isRegistered === true) {
        return respond({ message: 'Account already registered. Please sign in.' }, 409);
      }

      const result = await GoogleAuthService.completeProfile(
        { ...validData, phone: normalizedPhone },
        session.user
      );
      if (result.success) scheduleSignupEvent(result.user ?? {});
      return respond(result, result.success ? 200 : 400);
    }

    // Email Registration Flow
    if (!validData.password) return respond({ message: 'Password is required for email signup' }, 400);

    const normalizedEmail = normalizeEmail(validData.email);
    const hasEmailVerification = await hasOTPVerification(normalizedEmail, 'signup');
    if (!hasEmailVerification) {
      if (isAuthRedisDegraded()) {
        return respond(
          { message: 'Verification service temporarily unavailable. Please try again shortly.' },
          503
        );
      }
      return respond({ message: 'Email verification is required before completing signup' }, 400);
    }

    const result = await RegistrationService.registerUser({ ...validData, phone: normalizedPhone });

    if (result.success) {
      await consumeOTPVerification(normalizedEmail, 'signup');
      scheduleSignupEvent(result.user ?? {});
      return respond(result, 201);
    }

    const isConflict = /already exists|taken/i.test(result.message);
    return respond(result, isConflict ? 409 : 400);
  } catch (error: unknown) {
    if (error instanceof AppError) return respond({ message: error.message }, error.status);
    logger.error('Signup Error:', error);
    return respond({ message: 'Internal Server Error' }, 500);
  }
}
