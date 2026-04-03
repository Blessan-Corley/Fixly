// Phase 2: Removed predictable public CSRF tokens from OTP send requests.
import { z } from 'zod';

import { getOptionalSession, parseBody, respond } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { buildPhoneLookupValues, normalizeEmail, normalizeIndianPhone } from '@/lib/auth-utils';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { sendSignupOTP, sendPasswordResetOTP, generateOTP, storeOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import User from '@/models/User';

type SendOtpBody = {
  email?: unknown;
  phone?: unknown;
  currentEmail?: unknown;
  purpose?: unknown;
  type?: unknown;
  name?: unknown;
};

const SendOtpSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    currentEmail: z.string().email().optional(),
    purpose: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
  })
  .refine((value) => Boolean(value.purpose || value.type), {
    message: 'OTP type is required',
    path: ['type'],
  });

type OtpPurpose =
  | 'signup'
  | 'password_reset'
  | 'email_verification'
  | 'email_change'
  | 'username_change';

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePurpose(value: string): OtpPurpose | '' {
  const normalized = value.toLowerCase();
  if (
    normalized === 'signup' ||
    normalized === 'password_reset' ||
    normalized === 'email_verification' ||
    normalized === 'email_change' ||
    normalized === 'username_change'
  ) {
    return normalized;
  }
  return '';
}

function isTemporarilyUnavailable(message: string | undefined): boolean {
  return typeof message === 'string' && /temporarily unavailable/i.test(message);
}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(env.NEXTAUTH_URL).host;
  } catch {
    return false;
  }
}

type SessionShape = {
  user?: {
    id?: string;
    email?: string | null;
  };
} | null;

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return respond({ message: 'Forbidden' }, 403);
    }

    const ip =
      request.headers.get('x-real-ip')?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const limit = await authSlidingRateLimit(`send_otp:${ip}`, 5, 3600);

    if (!limit.success) {
      if (limit.degraded) {
        return respond(
          { message: 'Verification service temporarily unavailable. Please try again shortly.' },
          503
        );
      }
      const retryAfter = Math.ceil(limit.retryAfter ?? 3600);
      return respond(
        { message: 'Too many attempts. Please try again later.' },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const parsedBody = await parseBody(request, SendOtpSchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }

    const email = normalizeEmail(parsedBody.data.email);
    const phone = asTrimmedString(parsedBody.data.phone);
    const currentEmail = normalizeEmail(parsedBody.data.currentEmail);
    const name = asTrimmedString(parsedBody.data.name);
    const rawPurpose =
      asTrimmedString(parsedBody.data.purpose) || asTrimmedString(parsedBody.data.type);
    const purpose = normalizePurpose(rawPurpose);

    if (!purpose) {
      return respond({ message: 'Valid OTP purpose is required' }, 400);
    }

    await connectDB();

    const requiresAuthenticatedEmailFlow =
      purpose === 'email_verification' ||
      purpose === 'email_change' ||
      purpose === 'username_change';
    const session = requiresAuthenticatedEmailFlow
      ? ((await getOptionalSession()) as SessionShape)
      : null;

    if (requiresAuthenticatedEmailFlow && !session?.user?.id) {
      return respond({ message: 'Authentication required' }, 401);
    }

    // Per-identifier rate limiting (complements IP-based limit)
    if (phone && purpose === 'signup') {
      const phoneLimit = await authSlidingRateLimit(`send_otp_phone:${phone}`, 5, 3600);
      if (!phoneLimit.success && !phoneLimit.degraded) {
        return respond(
          { message: 'Too many attempts for this number. Please try again later.' },
          429,
          { headers: { 'Retry-After': String(Math.ceil(phoneLimit.retryAfter ?? 3600)) } }
        );
      }
    }

    if (email && (purpose === 'signup' || purpose === 'password_reset')) {
      const emailLimit = await authSlidingRateLimit(`send_otp_email:${email}`, 5, 3600);
      if (!emailLimit.success && !emailLimit.degraded) {
        return respond(
          { message: 'Too many attempts for this address. Please try again later.' },
          429,
          { headers: { 'Retry-After': String(Math.ceil(emailLimit.retryAfter ?? 3600)) } }
        );
      }
    }

    // 1. Phone OTP (WhatsApp)
    if (phone) {
      const normalizedPhone = normalizeIndianPhone(phone);
      if (!normalizedPhone) {
        return respond({ message: 'Invalid phone number' }, 400);
      }

      // Check if phone exists for signup
      if (purpose === 'signup') {
        const existingUser = await User.findOne({
          phone: { $in: buildPhoneLookupValues(normalizedPhone) },
        });
        if (existingUser) {
          return respond({ message: 'Phone number already registered' }, 409);
        }
      }

      const otp = generateOTP();
      const storeResult = await storeOTP(normalizedPhone, otp, purpose);
      if (!storeResult.success) {
        return respond(
          { message: storeResult.message || 'Failed to store OTP' },
          isTemporarilyUnavailable(storeResult.message) ? 503 : 500
        );
      }

      const sent = await sendWhatsAppOTP(normalizedPhone.replace('+', ''), otp);

      if (sent) {
        return respond({ success: true, message: 'OTP sent via WhatsApp' });
      } else {
        return respond({ message: 'Failed to send WhatsApp message' }, 500);
      }
    }

    // 2. Email OTP (Legacy/Fallback)
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return respond({ message: 'Invalid email address' }, 400);
      }

      if (purpose === 'signup') {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return respond({ message: 'Email already registered' }, 409);
        }

        const otpResult = await sendSignupOTP(email, name || 'User');
        if (!otpResult.success) {
          return respond(
            { message: otpResult.message || 'Failed to send OTP' },
            isTemporarilyUnavailable(otpResult.message) ? 503 : 500
          );
        }

        return respond({ success: true, message: 'OTP sent to email' });
      }

      if (purpose === 'password_reset') {
        const user = await User.findByEmail(email);
        if (user) {
          const otpResult = await sendPasswordResetOTP(email, user.name);
          if (!otpResult.success && isTemporarilyUnavailable(otpResult.message)) {
            return respond({ message: otpResult.message }, 503);
          }
        }
        return respond({ success: true, message: 'If account exists, OTP sent' });
      }

      if (
        purpose === 'email_verification' ||
        purpose === 'email_change' ||
        purpose === 'username_change'
      ) {
        const sessionEmail = normalizeEmail(session?.user?.email);
        if (!sessionEmail) {
          return respond({ message: 'Authentication required' }, 401);
        }

        if (purpose === 'email_verification' || purpose === 'username_change') {
          if (email !== sessionEmail) {
            return respond(
              { message: 'Email does not match the active session' },
              400
            );
          }
        }

        if (purpose === 'email_change') {
          if (!currentEmail) {
            return respond({ message: 'Current email is required' }, 400);
          }

          if (currentEmail !== sessionEmail) {
            return respond(
              { message: 'Current email does not match the active session' },
              400
            );
          }

          if (email === sessionEmail) {
            return respond(
              { message: 'New email must be different from your current email' },
              400
            );
          }

          const existingUser = await User.findByEmail(email);
          if (existingUser) {
            return respond({ message: 'Email already registered' }, 409);
          }
        }

        const otp = generateOTP();
        const storeResult = await storeOTP(email, otp, purpose);
        if (!storeResult.success) {
          return respond(
            { message: storeResult.message || 'Failed to generate OTP' },
            isTemporarilyUnavailable(storeResult.message) ? 503 : 500
          );
        }

        const emailResult = await sendSignupOTP(email, name || 'User', otp);
        if (!emailResult.success) {
          return respond(
            { message: emailResult.message || 'Failed to send OTP' },
            isTemporarilyUnavailable(emailResult.message) ? 503 : 500
          );
        }

        return respond({
          success: true,
          message: 'OTP sent to email',
        });
      }
    }

    return respond({ message: 'Invalid request' }, 400);
  } catch (error) {
    if (error instanceof AppError) {
      return respond({ message: error.message }, error.status);
    }

    logger.error('Send OTP Error:', error);
    return respond({ message: 'Internal Server Error' }, 500);
  }
}
