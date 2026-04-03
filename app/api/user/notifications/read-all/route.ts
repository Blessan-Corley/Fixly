// Phase 2: Added a real mark-all-read endpoint for the user notifications API.
import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { requireSession, respond, serverError, unauthorized } from '@/lib/api';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { getNotificationService } from '@/lib/services/notifications';

async function invalidateNotificationCache(userId: string): Promise<void> {
  await redisUtils.invalidatePattern(`notifications:${userId}:*`);
}

export async function PATCH(request: Request) {
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
      return respond(
        {
          data: {
            unreadCount: 0,
          },
          message: 'No unread notifications found',
        },
        200
      );
    }

    await invalidateNotificationCache(userId);
    await publishToChannel(Channels.user(userId), Events.user.allNotificationsRead, {
      userId,
    });

    return respond(
      {
        data: {
          unreadCount: 0,
        },
        message: 'All notifications marked as read',
      },
      200
    );
  } catch (error: unknown) {
    logger.error('Mark all notifications read error:', error as Error);
    return serverError('Failed to mark notifications as read');
  }
}
