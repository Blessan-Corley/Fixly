import { z } from 'zod';

import {
  NOTIFICATION_PRIORITY,
  NOTIFICATION_TYPES,
  type NotificationType,
  type NotificationPriority as ServiceNotificationPriority,
} from '@/lib/services/notifications';

export type CreateNotificationBody = {
  targetUserId?: unknown;
  userId?: unknown;
  type?: unknown;
  priority?: unknown;
  title?: unknown;
  message?: unknown;
  data?: unknown;
  actionUrl?: unknown;
};

export type DeleteNotificationBody = {
  notificationId?: unknown;
  notificationIds?: unknown;
  deleteAll?: unknown;
};

export const CreateNotificationBodySchema: z.ZodType<CreateNotificationBody> = z.object({
  targetUserId: z.unknown().optional(),
  userId: z.unknown().optional(),
  type: z.unknown().optional(),
  priority: z.unknown().optional(),
  title: z.unknown().optional(),
  message: z.unknown().optional(),
  data: z.unknown().optional(),
  actionUrl: z.unknown().optional(),
});

export const DeleteNotificationBodySchema: z.ZodType<DeleteNotificationBody> = z.object({
  notificationId: z.unknown().optional(),
  notificationIds: z.unknown().optional(),
  deleteAll: z.unknown().optional(),
});

export const LEGACY_TYPE_TO_UNIFIED: Record<string, NotificationType> = {
  job_applied: NOTIFICATION_TYPES.JOB_APPLICATION,
  job_application: NOTIFICATION_TYPES.JOB_APPLICATION,
  application_accepted: NOTIFICATION_TYPES.APPLICATION_ACCEPTED,
  job_status: NOTIFICATION_TYPES.JOB_STATUS,
  job_status_update: NOTIFICATION_TYPES.JOB_STATUS_UPDATE,
  job_completed: NOTIFICATION_TYPES.JOB_COMPLETED,
  job_cancelled: NOTIFICATION_TYPES.JOB_CANCELLED,
  message: NOTIFICATION_TYPES.NEW_MESSAGE,
  message_received: NOTIFICATION_TYPES.NEW_MESSAGE,
  new_message: NOTIFICATION_TYPES.NEW_MESSAGE,
  private_message: NOTIFICATION_TYPES.PRIVATE_MESSAGE,
  comment_like: NOTIFICATION_TYPES.COMMENT_LIKE,
  comment_reply: NOTIFICATION_TYPES.COMMENT_REPLY,
  job_comment: NOTIFICATION_TYPES.JOB_COMMENT,
  payment_received: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
  payment_success: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
  payment_failed: NOTIFICATION_TYPES.PAYMENT_FAILED,
  verification_update: NOTIFICATION_TYPES.VERIFICATION_UPDATE,
  account_update: NOTIFICATION_TYPES.ACCOUNT_UPDATE,
  welcome: NOTIFICATION_TYPES.WELCOME,
  subscription: NOTIFICATION_TYPES.SUBSCRIPTION,
  new_review: NOTIFICATION_TYPES.NEW_REVIEW,
  rating_update: NOTIFICATION_TYPES.RATING_UPDATE,
};

export const CACHE_TTL = 60;
export const CACHE_KEY_PREFIX = 'notifications:';

export type NotificationsResponse = {
  notifications: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  unreadCount: number;
  categories: unknown[];
  timestamp: number;
};

export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

export function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const candidate of value) {
    const id = asTrimmedString(candidate);
    if (id) unique.add(id);
  }
  return Array.from(unique);
}

export function normalizeNotificationType(value: string): NotificationType | null {
  if (!value) return null;
  return LEGACY_TYPE_TO_UNIFIED[value] ?? null;
}

export function normalizePriority(
  value: unknown,
  type: NotificationType
): ServiceNotificationPriority {
  const normalized = asTrimmedString(value).toLowerCase();
  if (normalized === NOTIFICATION_PRIORITY.LOW) return NOTIFICATION_PRIORITY.LOW;
  if (normalized === NOTIFICATION_PRIORITY.NORMAL) return NOTIFICATION_PRIORITY.NORMAL;
  if (normalized === NOTIFICATION_PRIORITY.HIGH) return NOTIFICATION_PRIORITY.HIGH;
  if (normalized === NOTIFICATION_PRIORITY.URGENT) return NOTIFICATION_PRIORITY.URGENT;

  if (
    type === NOTIFICATION_TYPES.PAYMENT_FAILED ||
    type === NOTIFICATION_TYPES.APPLICATION_ACCEPTED
  ) {
    return NOTIFICATION_PRIORITY.HIGH;
  }
  if (type === NOTIFICATION_TYPES.JOB_APPLICATION || type === NOTIFICATION_TYPES.NEW_MESSAGE) {
    return NOTIFICATION_PRIORITY.NORMAL;
  }
  return NOTIFICATION_PRIORITY.LOW;
}

export function parseCachedNotifications(value: unknown): NotificationsResponse | null {
  if (!value) return null;

  const rawValue: unknown =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;

  if (!rawValue || typeof rawValue !== 'object') return null;
  const data = rawValue as Record<string, unknown>;
  const pagination = data.pagination as Record<string, unknown> | undefined;

  if (!Array.isArray(data.notifications)) return null;
  if (!pagination || typeof pagination !== 'object') return null;
  if (typeof pagination.page !== 'number') return null;
  if (typeof pagination.limit !== 'number') return null;
  if (typeof pagination.total !== 'number') return null;
  if (typeof pagination.totalPages !== 'number') return null;
  if (typeof pagination.hasMore !== 'boolean') return null;
  if (typeof data.unreadCount !== 'number') return null;
  if (!Array.isArray(data.categories)) return null;
  if (typeof data.timestamp !== 'number') return null;

  return data as NotificationsResponse;
}
