// Phase 2: Updated change-password mutations to validate CSRF against the authenticated session.
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { badRequest, parseBody, requireSession, respond, unauthorized } from '@/lib/api';
import { AppError } from '@/lib/api/errors';
import { invalidateAuthCache, normalizeEmail } from '@/lib/auth-utils';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { verifyOTP } from '@/lib/otpService';
import { csrfGuard } from '@/lib/security/csrf';
import { passwordSchema } from '@/lib/validations/auth';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const ChangePasswordSchema = z.object({
  newPassword: z.unknown().optional(),
  otp: z.unknown().optional(),
  email: z.unknown().optional(),
});

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isTemporarilyUnavailable(message: string | undefined): boolean {
  return typeof message === 'string' && /temporarily unavailable/i.test(message);
}

export async function PUT(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'change_password', 5, 60 * 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          { message: 'Password change is temporarily unavailable. Please try again shortly.' },
          503
        );
      }

      const retryAfter = Math.max(
        0,
        Math.ceil(((rateLimitResult.resetTime ?? Date.now() + 3600_000) - Date.now()) / 1000)
      );
      return respond(
        {
          message: 'Too many password change attempts. Please try again later.',
          retryAfter,
          resetTime: new Date(rateLimitResult.resetTime ?? Date.now() + retryAfter * 1000).toISOString(),
        },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, ChangePasswordSchema);
    if ('error' in parsed) return parsed.error;

    const newPassword = asTrimmedString(parsed.data.newPassword);
    const otp = asTrimmedString(parsed.data.otp);
    const email = normalizeEmail(parsed.data.email);

    if (!newPassword || !otp || !email) {
      return badRequest('New password, OTP, and email are required');
    }

    if (!isValidEmail(email)) {
      return badRequest('Invalid email format');
    }

    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      return badRequest(passwordValidation.error.issues[0]?.message || 'Invalid password format');
    }

    const otpVerification = await verifyOTP(email, otp, 'password_reset');
    if (!otpVerification.success) {
      return respond(
        { message: otpVerification.message || 'Invalid OTP' },
        isTemporarilyUnavailable(otpVerification.message) ? 503 : 400
      );
    }

    await connectDB();

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      return respond({ message: 'User not found' }, 404);
    }

    if (user.authMethod !== 'email' || user.googleId) {
      return badRequest(
        'This account uses Google Sign-In. Use Google login instead.'
      );
    }

    if (String(user.email || '').toLowerCase() !== email) {
      return badRequest('Email does not match');
    }

    if (user.passwordHash) {
      const isSameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSameAsCurrent) {
        return badRequest('New password must be different from your current password');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.passwordHash = hashedPassword;
    user.lastActivityAt = new Date();
    await user.save();
    await invalidateAuthCache(String(user._id));

    await user.addNotification(
      'security_update',
      'Password Changed',
      'Your account password has been successfully updated.'
    );

    return respond({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return respond({ message: error.message }, error.status);
    }

    const err = error as Error;
    logger.error('Change password error:', err);
    return respond(
      {
        message: 'Failed to change password',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
