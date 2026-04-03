import { CHANNELS, EVENTS } from '@/lib/ably';
import { publishToChannel } from '@/lib/ably/publisher';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/services/notifications/preferences';

export async function publishNotificationReadEvent(
  userId: string,
  notificationIds: string[],
  markAll: boolean
): Promise<void> {
  try {
    await publishToChannel(CHANNELS.userNotifications(userId), EVENTS.NOTIFICATION_READ, {
      userId,
      notificationIds,
      markAll,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.warn('[NotificationService] Failed to publish read event', {
      userId,
      error: getErrorMessage(error),
    });
  }
}
