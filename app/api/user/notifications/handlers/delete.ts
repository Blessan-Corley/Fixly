import { Channels as TypedChannels, Events as TypedEvents } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import {
  badRequest,
  notFound,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asBoolean,
  asTrimmedString,
  CACHE_KEY_PREFIX,
  DeleteNotificationBodySchema,
  normalizeIds,
  type DeleteNotificationBody,
} from './shared';

export async function DELETE(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'delete_notification', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, DeleteNotificationBodySchema);
    const body: DeleteNotificationBody = 'data' in parsedBody ? parsedBody.data : {};

    const deleteAll = asBoolean(body.deleteAll);
    const singleId = asTrimmedString(body.notificationId);
    const multipleIds = normalizeIds(body.notificationIds);
    const idsToDelete = deleteAll
      ? []
      : multipleIds.length > 0
        ? multipleIds
        : singleId
          ? [singleId]
          : [];

    if (!deleteAll && idsToDelete.length === 0) {
      return badRequest('notificationId, notificationIds, or deleteAll is required');
    }

    await connectDB();
    const user = await User.findById(userId).select('notifications');
    if (!user) {
      return notFound('User');
    }

    const notifications = Array.isArray(user.notifications) ? user.notifications : [];
    const deleteSet = new Set(idsToDelete);

    user.notifications = deleteAll
      ? []
      : notifications.filter((notification: Record<string, unknown>) => {
          const id = asTrimmedString(notification.id);
          const legacyId = asTrimmedString(notification._id?.toString?.() ?? notification._id);
          return !deleteSet.has(id) && !deleteSet.has(legacyId);
        });

    await user.save();

    const remainingNotifications = Array.isArray(user.notifications) ? user.notifications : [];
    const unreadCount = remainingNotifications.filter(
      (notification: Record<string, unknown>) => notification.read !== true
    ).length;

    try {
      const cachePattern = `${CACHE_KEY_PREFIX}${userId}:*`;
      await redisUtils.invalidatePattern(cachePattern);
    } catch (cacheError: unknown) {
      logger.info('Cache invalidation error:', (cacheError as Error).message);
    }

    try {
      await publishToChannel(TypedChannels.user(userId), TypedEvents.user.notificationDeleted, {
        notificationIds: deleteAll ? [] : idsToDelete,
        deleteAll,
        unreadCount,
        timestamp: Date.now(),
      });
    } catch (ablyError: unknown) {
      logger.info('Notification delete publish error:', (ablyError as Error).message);
    }

    return respond({
      success: true,
      deleted: deleteAll ? notifications.length : idsToDelete.length,
      message: deleteAll
        ? 'All notifications deleted'
        : idsToDelete.length > 1
          ? `${idsToDelete.length} notifications deleted`
          : 'Notification deleted',
    });
  } catch (error: unknown) {
    logger.error('Delete notification error:', error as Error);
    return serverError('Failed to delete notification');
  }
}
