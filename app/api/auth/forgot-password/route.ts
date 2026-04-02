// Phase 2: Removed predictable public CSRF tokens from forgot-password requests.
import { z } from 'zod';

import { respond } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { parseBody } from '@/lib/api/parse';
import { getClientIp, isAllowedOrigin } from '@/lib/api/request';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { sendPasswordResetOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});
const GENERIC_FORGOT_PASSWORD_MESSAGE =
  'If an eligible account exists for that email address, a verification code has been sent.';

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return respond({ success: false, message: 'Forbidden' }, 403);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await authSlidingRateLimit(`forgot_password:${ip}`, 3, 15 * 60);
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          {
            success: false,
            message: 'Password reset is temporarily unavailable. Please try again shortly.',
          },
          503
        );
      }
      const retryAfter = Math.ceil(rateLimitResult.retryAfter ?? 15 * 60);
      return respond(
        {
          success: false,
          message: 'Too many password reset attempts. Please wait before trying again.',
        },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const parsed = await parseBody(request, ForgotPasswordSchema);
    if ('error' in parsed) {
      return parsed.error;
    }
    const email = parsed.data.email.toLowerCase();

    await connectDB();

    const user = await User.findOne({ email }).select(
      'name email authMethod googleId banned isActive deletedAt'
    );

    if (
      user &&
      user.authMethod === 'email' &&
      !Boolean(user.googleId) &&
      !Boolean(user.banned) &&
      user.isActive !== false &&
      !Boolean(user.deletedAt)
    ) {
      const otpResult = await sendPasswordResetOTP(email, user.name);
      if (!otpResult.success) {
        logger.warn(
          'Forgot password OTP delivery failed:',
          otpResult.message || 'Unknown OTP error'
        );
      }
    }

    return respond({
      success: true,
      message: GENERIC_FORGOT_PASSWORD_MESSAGE,
      expiresIn: 300,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return respond(
        {
          success: false,
          message: error.message,
        },
        error.status
      );
    }

    logger.error('Forgot password error:', error);
    return respond(
      {
        success: false,
        message: 'An error occurred. Please try again later.',
      },
      500
    );
  }
}
