import { z } from 'zod';

import { badRequest, notFound, parseBody, requireSession, respond, unauthorized } from '@/lib/api';
import {
  buildPhoneLookupValues,
  computeIsFullyVerified,
  invalidateAuthCache,
  normalizeIndianPhone,
} from '@/lib/auth-utils';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const UpdatePhoneSchema = z.object({
  phoneNumber: z.string().optional(),
  phone: z.string().optional(),
  otp: z.string().optional(),
});

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function PUT(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'update_phone', 5, 60 * 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          { message: 'Phone update is temporarily unavailable. Please try again shortly.' },
          503
        );
      }

      return respond(
        { message: 'Too many phone update attempts. Please try again later.' },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, UpdatePhoneSchema);
    if ('error' in parsed) return parsed.error;

    const phoneNumber = asTrimmedString(parsed.data.phoneNumber ?? parsed.data.phone);
    if (!phoneNumber) {
      return badRequest('Phone number is required');
    }

    const formattedPhone = normalizeIndianPhone(phoneNumber);
    if (!formattedPhone) {
      return badRequest('Please enter a valid 10-digit phone number');
    }

    if (env.NODE_ENV === 'production') {
      const indianPhoneRegex = /^\+91[6-9]\d{9}$/;
      if (!indianPhoneRegex.test(formattedPhone)) {
        return badRequest('Please enter a valid Indian phone number (starting with 6-9)');
      }
    }

    await connectDB();

    const existingUser = await User.findOne({
      phone: { $in: buildPhoneLookupValues(formattedPhone) },
      _id: { $ne: userId },
    })
      .select('_id')
      .lean();

    if (existingUser) {
      return badRequest('This phone number is already registered with another account');
    }

    const user = await User.findById(userId);
    if (!user) {
      return notFound('User');
    }

    user.phone = formattedPhone;
    user.phoneVerified = false;
    user.phoneVerifiedAt = undefined;
    user.isVerified = computeIsFullyVerified(user.emailVerified, user.phoneVerified);
    user.lastActivityAt = new Date();
    await user.save();
    await invalidateAuthCache(String(user._id));

    try {
      await user.addNotification(
        'settings_updated',
        'Phone Number Updated',
        `Your phone number has been updated to ${formattedPhone}. Please verify your new number.`
      );
    } catch (notificationError: unknown) {
      logger.error('Phone update notification error:', notificationError as Error);
    }

    return respond({
      success: true,
      message: 'Phone number updated successfully. Please verify your new number.',
      user: {
        id: String(user._id),
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        isVerified: user.isVerified,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update phone error:', err);
    return respond(
      {
        message: 'Failed to update phone number',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
