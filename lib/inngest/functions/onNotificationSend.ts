import { inngest } from '@/lib/inngest/client';
import { NotificationService } from '@/lib/services/notifications';

export const onNotificationSend = inngest.createFunction(
  { id: 'on-notification-send', name: 'Store single notification in background' },
  { event: 'notification/send' },
  async ({ event, step }) => {
    const { userId, type, title, message, link, metadata } = event.data;

    await step.run('store-notification', async () => {
      await NotificationService.createNotification(
        userId,
        type,
        title,
        message,
        link,
        metadata
      );
    });
  }
);

export const onBulkNotificationSend = inngest.createFunction(
  { id: 'on-bulk-notification-send', name: 'Store bulk notifications in background' },
  { event: 'notification/send.bulk' },
  async ({ event, step }) => {
    await step.run('store-bulk-notifications', async () => {
      await Promise.allSettled(
        event.data.notifications.map((notification: {
          userId: string;
          type: string;
          title: string;
          message: string;
          link?: string;
          metadata?: Record<string, unknown>;
        }) =>
          NotificationService.createNotification(
            notification.userId,
            notification.type,
            notification.title,
            notification.message,
            notification.link,
            notification.metadata
          )
        )
      );
    });
  }
);
