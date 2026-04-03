import type { IUser } from '@/types/User';

export const NOTIFICATION_TYPES = {
  JOB_APPLICATION: 'job_application',
  APPLICATION_ACCEPTED: 'application_accepted',
  APPLICATION_REJECTED: 'application_rejected',
  JOB_STATUS_UPDATE: 'job_status_update',
  JOB_STATUS: 'job_status',
  JOB_COMPLETED: 'job_completed',
  JOB_CANCELLED: 'job_cancelled',
  NEW_MESSAGE: 'new_message',
  PRIVATE_MESSAGE: 'private_message',
  COMMENT_LIKE: 'comment_like',
  COMMENT_REPLY: 'comment_reply',
  JOB_COMMENT: 'job_comment',
  PROFILE_VIEW: 'profile_view',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  VERIFICATION_UPDATE: 'verification_update',
  ACCOUNT_UPDATE: 'account_update',
  WELCOME: 'welcome',
  SUBSCRIPTION: 'subscription',
  NEW_REVIEW: 'new_review',
  RATING_UPDATE: 'rating_update',
  DISPUTE: 'dispute',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY];

export const NOTIFICATION_CATEGORIES = {
  JOBS: 'jobs',
  MESSAGES: 'messages',
  SOCIAL: 'social',
  PAYMENTS: 'payments',
  SYSTEM: 'system',
  REVIEWS: 'reviews',
  DISPUTES: 'disputes',
} as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

export const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  [NOTIFICATION_TYPES.JOB_APPLICATION]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.APPLICATION_ACCEPTED]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.APPLICATION_REJECTED]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.JOB_STATUS_UPDATE]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.JOB_STATUS]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.JOB_COMPLETED]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.JOB_CANCELLED]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.NEW_MESSAGE]: NOTIFICATION_CATEGORIES.MESSAGES,
  [NOTIFICATION_TYPES.PRIVATE_MESSAGE]: NOTIFICATION_CATEGORIES.MESSAGES,
  [NOTIFICATION_TYPES.COMMENT_LIKE]: NOTIFICATION_CATEGORIES.SOCIAL,
  [NOTIFICATION_TYPES.COMMENT_REPLY]: NOTIFICATION_CATEGORIES.SOCIAL,
  [NOTIFICATION_TYPES.JOB_COMMENT]: NOTIFICATION_CATEGORIES.SOCIAL,
  [NOTIFICATION_TYPES.PROFILE_VIEW]: NOTIFICATION_CATEGORIES.SOCIAL,
  [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: NOTIFICATION_CATEGORIES.PAYMENTS,
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: NOTIFICATION_CATEGORIES.PAYMENTS,
  [NOTIFICATION_TYPES.SUBSCRIPTION]: NOTIFICATION_CATEGORIES.PAYMENTS,
  [NOTIFICATION_TYPES.VERIFICATION_UPDATE]: NOTIFICATION_CATEGORIES.SYSTEM,
  [NOTIFICATION_TYPES.ACCOUNT_UPDATE]: NOTIFICATION_CATEGORIES.SYSTEM,
  [NOTIFICATION_TYPES.WELCOME]: NOTIFICATION_CATEGORIES.SYSTEM,
  [NOTIFICATION_TYPES.NEW_REVIEW]: NOTIFICATION_CATEGORIES.REVIEWS,
  [NOTIFICATION_TYPES.RATING_UPDATE]: NOTIFICATION_CATEGORIES.REVIEWS,
  [NOTIFICATION_TYPES.DISPUTE]: NOTIFICATION_CATEGORIES.DISPUTES,
};

export type NotificationMetadata = Record<string, unknown>;

export type StoredNotification = {
  id: string;
  userId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: NotificationPriority;
  actionUrl: string;
  data: NotificationMetadata;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
};

export type NotificationInput =
  | {
      userId: string;
      type: string;
      data?: NotificationMetadata;
      priority?: NotificationPriority;
      title?: string;
      message?: string;
      actionUrl?: string;
    }
  | string;

export type LegacyPriority = 'low' | 'medium' | 'high' | 'critical';
export type TemplateActionData = Record<string, unknown>;

export type NotificationTemplate = {
  type: string;
  title: string;
  getMessage: (data: Record<string, unknown>) => string;
  priority: LegacyPriority;
  actionData: (data: Record<string, unknown>) => TemplateActionData;
};

export type TemplateSendOptions = {
  senderId?: string | null;
  actionData?: Record<string, unknown>;
  priority?: LegacyPriority;
};

export type TemplateNotificationResult =
  | { success: true; notificationId: string; notification: StoredNotification }
  | { success: false; error: string; violations?: unknown };

export type UserDocument = IUser & {
  pushSubscription?: unknown;
};
