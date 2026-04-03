// Phase 2: Removed predictable public CSRF tokens from OTP verification requests.
import { z } from 'zod';

import { requireSession, respond } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { parseBody } from '@/lib/api/parse';
import {
  computeIsFullyVerified,
  invalidateAuthCache,
  normalizeEmail,
  normalizeIndianPhone,
} from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { verifyOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import User from '@/models/User';

const VerifyOtpSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    otp: z.string().min(4),
    purpose: z.string().optional(),
    type: z.string().optional(),
  })
  .refine((value) => Boolean(value.purpose || value.type), {
    message: 'OTP type is required',
    path: ['type'],
  });

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isTemporarilyUnavailable(message: string | undefined): boolean {
  return typeof message === 'string' && /temporarily unavailable/i.test(message);
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown';
    const limit = await authSlidingRateLimit(`verify_otp:${ip}`, 10, 3600);

    if (!limit.success) {
      if (limit.degraded) {
        return respond(
          { message: 'Verification service temporarily unavailable. Please try again shortly.' },
          503
        );
      }
      const retryAfter = Math.ceil(limit.retryAfter ?? 3600);
      return respond(
        { message: 'Too many verification attempts. Please try again later.' },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const parsed = await parseBody(request, VerifyOtpSchema);
    if ('error' in parsed) {
      return parsed.error;
    }

    const otp = asTrimmedString(parsed.data.otp);
    const purpose = asTrimmedString(parsed.data.purpose) || asTrimmedString(parsed.data.type);
    const email = normalizeEmail(parsed.data.email);
    const phone = normalizeIndianPhone(parsed.data.phone);

    const identifier = phone || email;
    if (!identifier) {
      return respond({ message: 'Email or Phone required' }, 400);
    }

    const result = await verifyOTP(identifier, otp, purpose);

    if (result.success) {
      if (purpose === 'email_verification') {
        const auth = await requireSession();
        if ('error' in auth) return auth.error;

        const userId = auth.session.user.id;
        const sessionEmail = normalizeEmail(auth.session.user.email);
        if (!userId || !sessionEmail) {
          return respond({ message: 'Authentication required' }, 401);
        }

        if (sessionEmail !== email) {
          return respond(
            { message: 'Email does not match the active session' },
            400
          );
        }

        await connectDB();

        const user = await User.findById(userId);
        if (!user) {
          return respond({ message: 'User not found' }, 404);
        }

        user.emailVerified = true;
        user.emailVerifiedAt = new Date();
        user.isVerified = computeIsFullyVerified(user.emailVerified, user.phoneVerified);
        user.lastActivityAt = new Date();
        await user.save();
        await invalidateAuthCache(String(user._id));

        return respond({
          success: true,
          message: 'Verified',
          user: {
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            isVerified: user.isVerified,
          },
        });
      }

      return respond({ success: true, message: 'Verified' });
    } else {
      return respond(
        { message: result.message },
        isTemporarilyUnavailable(result.message) ? 503 : 400
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      return respond({ message: error.message }, error.status);
    }

    logger.error('Verify OTP Error:', error);
    return respond({ message: 'Internal Server Error' }, 500);
  }
}
