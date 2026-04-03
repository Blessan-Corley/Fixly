// Phase 2: Removed predictable public CSRF tokens from reset-password requests.
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { badRequest, forbidden, notFound, respond } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { parseBody } from '@/lib/api/parse';
import { invalidateAuthCache, normalizeEmail } from '@/lib/auth-utils';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { consumeOTPVerification, verifyOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import { emailSchema, passwordSchema } from '@/lib/validations/auth';
import User from '@/models/User';

const OTP_REGEX = /^\d{6}$/;
const ResetPasswordSchema = z.object({
  email: z.unknown().optional(),
  newPassword: z.unknown().optional(),
  otp: z.unknown().optional(),
});

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const last = forwarded.split(',')[0]?.trim();
    if (last) return last;
  }
  return 'unknown';
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

function isTemporarilyUnavailable(message: string | undefined): boolean {
  return typeof message === 'string' && /temporarily unavailable/i.test(message);
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return respond({ message: 'Forbidden' }, 403);
    }

    const ip = getClientIp(request);
    const rateLimitResult = await authSlidingRateLimit(`reset_password:${ip}`, 5, 60 * 60);
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
      const retryAfter = Math.ceil(rateLimitResult.retryAfter ?? 60 * 60);
      return respond(
        {
          success: false,
          message: 'Too many password reset attempts. Please try again later.',
        },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const parsedBody = await parseBody(request, ResetPasswordSchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }

    const email = normalizeEmail(parsedBody.data.email);
    const newPassword = toTrimmedString(parsedBody.data.newPassword) || '';
    const otp = toTrimmedString(parsedBody.data.otp) || '';

    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      return badRequest('Please enter a valid email address');
    }

    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      return badRequest('Password does not meet security requirements');
    }

    const hasVerificationReceipt = await consumeOTPVerification(email, 'password_reset');
    if (!hasVerificationReceipt) {
      if (!OTP_REGEX.test(otp)) {
        return badRequest('OTP must be 6 digits');
      }

      const otpResult = await verifyOTP(email, otp, 'password_reset');
      if (!otpResult.success) {
        return respond(
          {
            success: false,
            message: otpResult.message || 'Invalid or expired verification code',
          },
          isTemporarilyUnavailable(otpResult.message) ? 503 : 400
        );
      }
    }

    await connectDB();

    const user = await User.findOne({ email }).select(
      '+passwordHash name authMethod googleId banned isActive deletedAt lastActivityAt'
    );
    if (!user) {
      return notFound('User');
    }

    if (user.authMethod !== 'email' || Boolean(user.googleId)) {
      return badRequest('This account uses Google Sign-In. Use Google login instead.');
    }

    if (user.banned) {
      return forbidden('Account is suspended. Please contact support.');
    }

    if (user.isActive === false || user.deletedAt) {
      return forbidden('Account is inactive. Please contact support.');
    }

    if (user.passwordHash) {
      const isSameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSameAsCurrent) {
        return badRequest('New password must be different from your current password');
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.lastActivityAt = new Date();
    await user.save();
    await invalidateAuthCache(String(user._id));

    try {
      await user.addNotification?.(
        'password_updated',
        'Password Updated',
        'Your account password was reset successfully.'
      );
    } catch (notificationError: unknown) {
      logger.warn('Password reset notification failed:', notificationError);
    }

    return respond({
      success: true,
      message: 'Password reset successful! You can now sign in with your new password.',
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

    logger.error('Reset password error:', error);
    return respond(
      {
        success: false,
        message: 'Failed to reset password. Please try again.',
      },
      500
    );
  }
}
