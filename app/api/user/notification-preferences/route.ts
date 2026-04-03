import { z } from 'zod';

import { badRequest, notFound, ok, requireSession, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';
import type { IUser } from '@/types/User';
import { rateLimit } from '@/utils/rateLimiting';

type NotificationPreferencesBody = {
  browserNotifications?: unknown;
  preferences?: unknown;
};

const NotificationPreferencesSchema = z.object({
  browserNotifications: z.boolean().optional(),
  preferences: z
    .object({
      browserNotifications: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'notification_preferences', 20, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, NotificationPreferencesSchema);
    if ('error' in parsed) {
      return parsed.error;
    }

    const browserNotifications =
      parsed.data.browserNotifications ?? parsed.data.preferences?.browserNotifications;

    if (typeof browserNotifications !== 'boolean') {
      return badRequest('browserNotifications must be a boolean');
    }

    await connectDB();

    const user = (await User.findById(userId)) as IUser | null;
    if (!user) {
      return notFound('User');
    }

    user.preferences = {
      ...user.preferences,
      browserNotifications,
    };
    await user.save();

    return ok({
      message: 'Notification preferences updated',
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Error updating notification preferences:', err);
    return serverError('Failed to update preferences');
  }
}

export async function GET(_request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    await connectDB();

    const user = await User.findById(userId).select('preferences');
    if (!user) {
      return notFound('User');
    }

    return ok({
      preferences: user.preferences || {
        browserNotifications: false,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Error fetching notification preferences:', err);
    return serverError('Failed to fetch preferences');
  }
}
