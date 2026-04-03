// Phase 2: Added real single-notification read and delete endpoints for the user notifications API.
import { z } from 'zod';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { badRequest, requireSession, respond, serverError, unauthorized } from '@/lib/api';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { getNotificationService } from '@/lib/services/notifications';

type NotificationRouteContext = {
  params: Promise<{
    id?: string;
  }>;
};

const NotificationIdSchema = z.object({
  id: z.string().min(1),
});

async function invalidateNotificationCache(userId: string): Promise<void> {
  await redisUtils.invalidatePattern(`notifications:${userId}:*`);
}

export async function PATCH(request: Request, context: NotificationRouteContext) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = NotificationIdSchema.safeParse((await context.params));
    if (!parsed.success) {
      return badRequest('Notification ID is required');
    }

    const notificationService = await getNotificationService();
    const success = await notificationService.markAsRead(userId, [parsed.data.id]);
    if (!success) {
      return respond(
        { error: 'Notification not found', message: 'Notification not found' },
        404
      );
    }

    const unreadCount = await notificationService.getUnreadCount(userId);
    await invalidateNotificationCache(userId);
    await publishToChannel(Channels.user(userId), Events.user.notificationRead, {
      notificationId: parsed.data.id,
    });

    return respond(
      {
        data: {
          notificationId: parsed.data.id,
          unreadCount,
        },
        message: 'Notification marked as read',
      },
      200
    );
  } catch (error: unknown) {
    logger.error('Single notification mark-as-read error:', error as Error);
    return serverError('Failed to mark notification as read');
  }
}

export async function DELETE(request: Request, context: NotificationRouteContext) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = NotificationIdSchema.safeParse((await context.params));
    if (!parsed.success) {
      return badRequest('Notification ID is required');
    }

    const notificationService = await getNotificationService();
    const result = await notificationService.deleteNotifications(userId, [parsed.data.id]);
    if (result.deletedCount === 0) {
      return respond(
        { error: 'Notification not found', message: 'Notification not found' },
        404
      );
    }

    await invalidateNotificationCache(userId);
    await publishToChannel(Channels.user(userId), Events.user.notificationDeleted, {
      notificationIds: [parsed.data.id],
      deleteAll: false,
      unreadCount: result.unreadCount,
      timestamp: Date.now(),
    });

    return respond(
      {
        data: {
          notificationId: parsed.data.id,
          unreadCount: result.unreadCount,
        },
        message: 'Notification deleted',
      },
      200
    );
  } catch (error: unknown) {
    logger.error('Single notification delete error:', error as Error);
    return serverError('Failed to delete notification');
  }
}
