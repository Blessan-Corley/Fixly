// Phase 2: Removed predictable public CSRF tokens from OTP send requests.
import { z } from 'zod';

import { getOptionalSession, parseBody, respond } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { isAllowedOrigin } from '@/lib/api/request';
import { normalizeEmail } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { authSlidingRateLimit } from '@/lib/redis';

import { handleEmailOtp, handlePhoneOtp } from './handlers';
import type { OtpPurpose } from './types';

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

type SessionShape = {
  user?: { id?: string; email?: string | null };
} | null;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePurpose(value: string): OtpPurpose | '' {
  const v = value.toLowerCase() as OtpPurpose;
  const valid: OtpPurpose[] = [
    'signup', 'password_reset', 'email_verification', 'email_change', 'username_change',
  ];
  return valid.includes(v) ? v : '';
}

export async function POST(request: Request): Promise<Response> {
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
      return respond(
        { message: 'Too many attempts. Please try again later.' },
        429,
        { headers: { 'Retry-After': String(Math.ceil(limit.retryAfter ?? 3600)) } }
      );
    }

    const parsedBody = await parseBody(request, SendOtpSchema);
    if ('error' in parsedBody) return parsedBody.error;

    const email = normalizeEmail(parsedBody.data.email);
    const phone = asTrimmedString(parsedBody.data.phone);
    const currentEmail = normalizeEmail(parsedBody.data.currentEmail);
    const name = asTrimmedString(parsedBody.data.name);
    const rawPurpose =
      asTrimmedString(parsedBody.data.purpose) || asTrimmedString(parsedBody.data.type);
    const purpose = normalizePurpose(rawPurpose);

    if (!purpose) return respond({ message: 'Valid OTP purpose is required' }, 400);

    await connectDB();

    const requiresAuth =
      purpose === 'email_verification' ||
      purpose === 'email_change' ||
      purpose === 'username_change';
    const session = requiresAuth ? ((await getOptionalSession()) as SessionShape) : null;

    if (requiresAuth && !session?.user?.id) {
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

    if (phone) return handlePhoneOtp(phone, purpose);
    if (email) return handleEmailOtp(email, purpose, name, currentEmail, session);

    return respond({ message: 'Invalid request' }, 400);
  } catch (error) {
    if (error instanceof AppError) {
      return respond({ message: error.message }, error.status);
    }
    logger.error('Send OTP Error:', error);
    return respond({ message: 'Internal Server Error' }, 500);
  }
}
