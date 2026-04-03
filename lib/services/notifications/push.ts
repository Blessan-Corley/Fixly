import { logger } from '@/lib/logger';
import { getPushNotificationUser } from '@/lib/services/notifications/persistence';
import {
  isValidStoredPushSubscription,
  sendWebPushMessage,
  type StoredPushSubscription,
} from '@/lib/services/webPushServer';

export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const user = await getPushNotificationUser(userId);
  if (!user || user.preferences?.pushNotifications === false) return;

  const subscriptions = isValidStoredPushSubscription(user.pushSubscription)
    ? [user.pushSubscription as StoredPushSubscription]
    : [];

  if (subscriptions.length === 0) {
    logger.debug('[NotificationService] No valid push subscriptions found', { userId });
    return;
  }

  await Promise.all(
    subscriptions.map(async (subscription, index) => {
      const delivered = await sendWebPushMessage(subscription, {
        title,
        body,
        url: url || '/dashboard',
        tag: 'fixly-notification',
      });

      if (delivered) {
        logger.info('[NotificationService] Push delivered', { userId, subscriptionIndex: index });
        return;
      }

      logger.warn('[NotificationService] Push delivery failed', {
        userId,
        title,
        subscriptionIndex: index,
      });
    })
  );
}
