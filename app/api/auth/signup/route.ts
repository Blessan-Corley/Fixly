// Phase 2: Simplified signup parsing and aligned auth/content dependencies with the hardened flows.

import { after } from 'next/server';

import { getOptionalSession, parseBody, respond } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { normalizeIndianPhone } from '@/lib/auth-utils';
import { env } from '@/lib/env';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { consumeOTPVerification, hasOTPVerification } from '@/lib/otpService';
import { authSlidingRateLimit, isAuthRedisDegraded } from '@/lib/redis';
import { signupApiSchema } from '@/lib/validations/auth';
import { GoogleAuthService } from '@/services/auth/googleService';
import { RegistrationService } from '@/services/auth/registrationService';

type SessionShape = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    authMethod?: string;
    isRegistered?: boolean;
    googleId?: string;
  };
} | null;

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(env.NEXTAUTH_URL).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return respond({ message: 'Forbidden' }, 403);
    }

    // 1. Rate Limiting
    const ip =
      request.headers.get('x-real-ip')?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const limit = await authSlidingRateLimit(`signup:${ip}`, 5, 3600);
    if (!limit.success) {
      if (limit.degraded) {
        return respond(
          { message: 'Signup is temporarily unavailable. Please try again shortly.' },
          503
        );
      }
      const retryAfter = Math.ceil(limit.retryAfter ?? 3600);
      return respond(
        { message: 'Too many signup attempts. Please try again later.' },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const parsedBody = await parseBody(request, signupApiSchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }

    const validData = parsedBody.data;

    // Per-email rate limiting (prevents targeting a single address from multiple IPs)
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
      return respond(
        { message: 'You must accept the terms and conditions' },
        400
      );
    }

    const normalizedPhone = normalizeIndianPhone(validData.phone);
    if (!normalizedPhone) {
      return respond({ message: 'A valid phone number is required' }, 400);
    }

    const { ContentValidator } = await import('@/lib/validations/content');
    const nameValidation = await ContentValidator.validateContent(validData.name, 'profile');
    if (!nameValidation.isValid) {
      return respond(
        {
          message: nameValidation.violations[0]?.message || 'Invalid name',
          suggestions: nameValidation.suggestions,
        },
        400
      );
    }

    const usernameValidation = await ContentValidator.validateUsername(validData.username);
    if (!usernameValidation.isValid) {
      return respond(
        {
          message: usernameValidation.violations[0]?.message || 'Invalid username',
          suggestions: usernameValidation.suggestions,
        },
        400
      );
    }

    if (Array.isArray(validData.skills) && validData.skills.length > 0) {
      const invalidSkills = await ContentValidator.validateSkills(validData.skills);
      if (invalidSkills.length > 0) {
        return respond(
          {
            message: invalidSkills[0]?.violations[0]?.message || 'Invalid skills',
            suggestions: invalidSkills[0]?.suggestions,
          },
          400
        );
      }
    }

    await connectDB();

    // 3. Google Completion Flow
    if (validData.isGoogleCompletion) {
      const session = (await getOptionalSession()) as SessionShape;
      if (!session?.user) return respond({ message: 'Unauthorized' }, 401);
      if (session.user.authMethod !== 'google') {
        return respond({ message: 'Invalid Google signup session' }, 401);
      }
      if (session.user.isRegistered === true) {
        return respond(
          { message: 'Account already registered. Please sign in.' },
          409
        );
      }

      const result = await GoogleAuthService.completeProfile(
        {
          ...validData,
          phone: normalizedPhone,
        },
        session.user
      );

      if (result.success && result.user?.id && result.user.email && result.user.name) {
        const { id: userId, email, name, role } = result.user;
        after(async () => {
          try {
            await inngest.send({
              name: 'user/signup.completed',
              data: {
                userId,
                email,
                name,
                role: role === 'fixer' ? 'fixer' : 'hirer',
              },
            });
          } catch (inngestError: unknown) {
            logger.warn('Failed to send signup.completed event:', inngestError);
          }
        });
      }

      return respond(result, result.success ? 200 : 400);
    }

    // 4. Email Registration Flow
    if (!validData.password) {
      return respond(
        { message: 'Password is required for email signup' },
        400
      );
    }

    const hasEmailVerification = await hasOTPVerification(validData.email, 'signup');
    if (!hasEmailVerification) {
      if (isAuthRedisDegraded()) {
        return respond(
          { message: 'Verification service temporarily unavailable. Please try again shortly.' },
          503
        );
      }
      return respond(
        { message: 'Email verification is required before completing signup' },
        400
      );
    }

    const result = await RegistrationService.registerUser({
      ...validData,
      phone: normalizedPhone,
    });

    if (result.success) {
      await consumeOTPVerification(validData.email, 'signup');
      if (result.user?.id && result.user.email && result.user.name) {
        const { id: userId, email, name, role } = result.user;
        after(async () => {
          try {
            await inngest.send({
              name: 'user/signup.completed',
              data: {
                userId,
                email,
                name,
                role: role === 'fixer' ? 'fixer' : 'hirer',
              },
            });
          } catch (inngestError: unknown) {
            logger.warn('Failed to send signup.completed event:', inngestError);
          }
        });
      }
    }

    if (result.success) {
      return respond(result, 201);
    }

    const conflict = /already exists|taken/i.test(result.message);
    return respond(result, conflict ? 409 : 400);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return respond({ message: error.message }, error.status);
    }

    logger.error('Signup Error:', error);
    return respond({ message: 'Internal Server Error' }, 500);
  }
}
