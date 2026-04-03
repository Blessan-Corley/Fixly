export {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_CATEGORIES,
  type NotificationType,
  type NotificationPriority,
  type NotificationCategory,
  type NotificationMetadata,
  type StoredNotification,
  type NotificationInput,
  type LegacyPriority,
  type TemplateActionData,
  type NotificationTemplate,
  type TemplateSendOptions,
  type TemplateNotificationResult,
  type UserDocument,
} from '@/lib/services/notifications/notification.types';
export { NOTIFICATION_TEMPLATES } from '@/lib/services/notifications/templates';
export {
  UnifiedNotificationService,
  NotificationService,
  getNotificationService,
  sendTemplatedNotification,
  notificationService,
} from '@/lib/services/notifications/service';
export { default } from '@/lib/services/notifications/service';
