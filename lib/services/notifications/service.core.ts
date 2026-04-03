import { logger } from '@/lib/logger';
import { sendEmailNotificationToUser } from '@/lib/services/notifications/email';
import {
  NOTIFICATION_PRIORITY,
  NOTIFICATION_TYPES,
  type NotificationInput,
  type NotificationMetadata,
  type NotificationPriority,
  type StoredNotification,
} from '@/lib/services/notifications/notification.types';
import {
  createStoredNotificationRecord,
  deleteStoredNotifications,
  getStoredNotifications,
  getUnreadNotificationCount,
  markStoredNotificationsAsRead,
} from '@/lib/services/notifications/persistence';
import {
  asString,
  getErrorMessage,
  toSafePriority,
} from '@/lib/services/notifications/preferences';
import { publishNotificationReadEvent } from '@/lib/services/notifications/publisher';
import { sendPushNotificationToUser } from '@/lib/services/notifications/push';

export class UnifiedNotificationService {
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    actionUrl?: string,
    metadata?: NotificationMetadata
  ): Promise<StoredNotification | null>;
  async createNotification(input: {
    userId: string;
    type: string;
    data?: NotificationMetadata;
    priority?: NotificationPriority;
    title?: string;
    message?: string;
    actionUrl?: string;
  }): Promise<StoredNotification | null>;
  async createNotification(
    inputOrUserId: NotificationInput,
    maybeType?: string,
    maybeTitle?: string,
    maybeMessage?: string,
    maybeActionUrl?: string,
    maybeMetadata?: NotificationMetadata
  ): Promise<StoredNotification | null> {
    const payload =
      typeof inputOrUserId === 'string'
        ? {
            userId: inputOrUserId,
            type: maybeType || NOTIFICATION_TYPES.ACCOUNT_UPDATE,
            title: maybeTitle || 'Notification',
            message: maybeMessage || '',
            actionUrl: maybeActionUrl,
            data: maybeMetadata || {},
            priority: toSafePriority(maybeMetadata?.priority),
          }
        : {
            userId: inputOrUserId.userId,
            type: inputOrUserId.type || NOTIFICATION_TYPES.ACCOUNT_UPDATE,
            title:
              inputOrUserId.title || asString(inputOrUserId.data?.title) || 'Notification',
            message:
              inputOrUserId.message || asString(inputOrUserId.data?.message) || '',
            actionUrl:
              inputOrUserId.actionUrl ||
              asString(inputOrUserId.data?.actionUrl) ||
              '/dashboard',
            data: inputOrUserId.data || {},
            priority: inputOrUserId.priority || NOTIFICATION_PRIORITY.NORMAL,
          };

    try {
      if (!payload.userId || !payload.type) return null;

      return await createStoredNotificationRecord({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl || '/dashboard',
        data: payload.data,
        priority: payload.priority,
      });
    } catch (error: unknown) {
      logger.error('[NotificationService] createNotification failed', {
        error: getErrorMessage(error),
        userId: typeof inputOrUserId === 'string' ? inputOrUserId : inputOrUserId.userId,
        type: maybeType,
      });
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      category?: string;
      type?: string;
      search?: string;
      unreadOnly?: boolean;
    } = {}
  ): Promise<{
    notifications: StoredNotification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  }> {
    return getStoredNotifications(userId, options);
  }

  async markAsRead(userId: string, notificationIds: string[] = []): Promise<boolean> {
    const changed = await markStoredNotificationsAsRead(userId, notificationIds);
    if (!changed) return false;
    await publishNotificationReadEvent(userId, notificationIds, notificationIds.length === 0);
    return true;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return getUnreadNotificationCount(userId);
  }

  async deleteNotifications(
    userId: string,
    notificationIds: string[] = []
  ): Promise<{ deletedCount: number; unreadCount: number }> {
    return deleteStoredNotifications(userId, notificationIds);
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    url?: string
  ): Promise<void> {
    await sendPushNotificationToUser(userId, title, body, url);
  }

  async sendEmailNotification(
    userId: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await sendEmailNotificationToUser(userId, type, data);
  }
}
