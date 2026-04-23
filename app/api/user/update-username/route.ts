import { z } from 'zod';

import { apiSuccess, requireSession, unauthorized } from '@/lib/api';
import { NotFoundError, ValidationError, handleRouteError } from '@/lib/api/errors';
import { parseBody } from '@/lib/api/parse';
import { invalidateAuthCache, normalizeEmail } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { verifyOTP } from '@/lib/otpService';
import { csrfGuard } from '@/lib/security/csrf';
import { ContentValidator } from '@/lib/validations/content-validator';
import { UsernameUpdateSchema, normalizeUsername, validateUsernameFormat } from '@/lib/validations/username';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asTrimmedString,
  buildRateLimitResponse,
  isTemporarilyUnavailable,
} from './update-username.helpers';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'update_username', 5, 60 * 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      return buildRateLimitResponse(rateLimitResult.degraded ?? false, rateLimitResult.resetTime);
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(
      request,
      UsernameUpdateSchema.extend({
        otp: z.string().min(1),
        email: z.string().email(),
      })
    );
    if ('error' in parsed) {
      throw new ValidationError('Invalid request data');
    }

    const username = normalizeUsername(asTrimmedString(parsed.data.username));
    const otp = asTrimmedString(parsed.data.otp);
    const email = normalizeEmail(parsed.data.email);

    if (!username || !otp || !email) {
      throw new ValidationError('Username, OTP, and email are required');
    }

    const usernameValidationError = validateUsernameFormat(username);
    if (usernameValidationError) {
      throw new ValidationError(usernameValidationError);
    }

    const contentValidation = await ContentValidator.validateUsername(username, userId || null);
    if (!contentValidation.isValid) {
      throw new ValidationError(
        contentValidation.violations[0]?.message || 'Invalid username',
        contentValidation.suggestions
      );
    }

    const otpVerification = await verifyOTP(email, otp, 'username_change');
    if (!otpVerification.success) {
      const isUnavailable = isTemporarilyUnavailable(otpVerification.message);
      return isUnavailable
        ? (handleRouteError(new Error(otpVerification.message || 'Service unavailable')))
        : (handleRouteError(new ValidationError(otpVerification.message || 'Invalid OTP')));
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    if ((user.usernameChangeCount || 0) >= 3) {
      throw new ValidationError('You have reached the maximum limit of 3 username changes');
    }

    const existingUser = await User.findOne({ username, _id: { $ne: userId } }).select('_id').lean();
    if (existingUser) throw new ValidationError('This username is already taken');

    if (String(user.username || '').toLowerCase() === username) {
      throw new ValidationError('This is already your current username');
    }

    user.username = username;
    user.usernameChangeCount = (user.usernameChangeCount || 0) + 1;
    user.lastUsernameChange = new Date();
    user.lastActivityAt = new Date();
    await user.save();
    await invalidateAuthCache(String(user._id));

    const changesRemaining = Math.max(0, 3 - (user.usernameChangeCount || 0));
    await user.addNotification(
      'settings_updated',
      'Username Updated',
      `Your username has been changed to @${username}. You have ${changesRemaining} changes remaining.`
    );

    return apiSuccess(
      {
        message: 'Username updated successfully',
        user: {
          id: String(user._id),
          username: user.username,
          usernameChangeCount: user.usernameChangeCount,
          changesRemaining,
        },
      },
      200
    );
  } catch (error: unknown) {
    logger.error({ error }, 'Update username error');
    return handleRouteError(error);
  }
}
