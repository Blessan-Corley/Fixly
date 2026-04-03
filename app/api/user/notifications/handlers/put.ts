import { Channels as TypedChannels, Events as TypedEvents } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { requireSession, respond, serverError, unauthorized } from '@/lib/api';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { getNotificationService } from '@/lib/services/notifications';

import { CACHE_KEY_PREFIX } from './shared';

export async function PUT(request: Request): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const notificationService = await getNotificationService();
    const success = await notificationService.markAsRead(userId, []);

    if (!success) {
      return serverError('Failed to mark notifications as read');
    }

    try {
      const cachePattern = `${CACHE_KEY_PREFIX}${userId}:*`;
      await redisUtils.invalidatePattern(cachePattern);
    } catch (cacheError: unknown) {
      logger.info('Cache invalidation error:', (cacheError as Error).message);
    }

    const response = respond({
      success: true,
      message: 'All notifications marked as read',
    });

    await publishToChannel(TypedChannels.user(userId), TypedEvents.user.allNotificationsRead, {
      userId,
    });

    response.headers.set('Cache-Control', 'no-cache');
    return response;
  } catch (error: unknown) {
    logger.error('Mark all notifications read error:', error as Error);
    return serverError('Failed to mark notifications as read');
  }
}
