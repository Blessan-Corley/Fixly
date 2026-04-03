import { PRIORITY } from '@/lib/ably';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_TYPES,
  TYPE_TO_CATEGORY,
  type LegacyPriority,
  type NotificationCategory,
  type NotificationMetadata,
  type NotificationPriority,
  type StoredNotification,
} from '@/lib/services/notifications/notification.types';

export function getCategory(type: string): NotificationCategory {
  return TYPE_TO_CATEGORY[type] || NOTIFICATION_CATEGORIES.SYSTEM;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

export function toSafeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(String(value || ''));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function toSafePriority(value: unknown): NotificationPriority {
  const normalized = asString(value).toLowerCase();
  if (normalized === NOTIFICATION_PRIORITY.LOW) return NOTIFICATION_PRIORITY.LOW;
  if (normalized === NOTIFICATION_PRIORITY.HIGH) return NOTIFICATION_PRIORITY.HIGH;
  if (normalized === NOTIFICATION_PRIORITY.URGENT) return NOTIFICATION_PRIORITY.URGENT;
  return NOTIFICATION_PRIORITY.NORMAL;
}

export function mapLegacyPriority(value: LegacyPriority | undefined): NotificationPriority {
  if (value === PRIORITY.LOW) return NOTIFICATION_PRIORITY.LOW;
  if (value === PRIORITY.HIGH) return NOTIFICATION_PRIORITY.HIGH;
  if (value === PRIORITY.CRITICAL) return NOTIFICATION_PRIORITY.URGENT;
  return NOTIFICATION_PRIORITY.NORMAL;
}

export function toStoredNotification(userId: string, raw: unknown): StoredNotification {
  const item = (raw ?? {}) as Record<string, unknown>;
  const type = asString(item.type, NOTIFICATION_TYPES.ACCOUNT_UPDATE);
  const data =
    item.data && typeof item.data === 'object' && !Array.isArray(item.data)
      ? (item.data as NotificationMetadata)
      : {};
  const createdAt = toSafeDate(item.createdAt);
  const actionUrl = asString(data.actionUrl, '/dashboard');

  return {
    id: asString(item.id, `notif_${createdAt.getTime()}`),
    userId,
    type,
    category: getCategory(type),
    title: asString(item.title, 'Notification'),
    body: asString(item.message),
    priority: toSafePriority(data.priority),
    actionUrl,
    data,
    read: item.read === true,
    createdAt,
    readAt: item.readAt ? toSafeDate(item.readAt) : undefined,
  };
}

export function resolveActionUrl(actionData: Record<string, unknown>): string {
  const explicitUrl = asString(actionData.actionUrl);
  if (explicitUrl) return explicitUrl;

  const action = asString(actionData.action);
  const jobId = asString(actionData.jobId);
  const commentId = asString(actionData.commentId);
  const conversationId = asString(actionData.conversationId);
  const disputeId = asString(actionData.disputeId);

  switch (action) {
    case 'view_job':
      return jobId ? `/jobs/${jobId}` : '/dashboard';
    case 'view_applications':
      return jobId ? `/dashboard/jobs/${jobId}` : '/dashboard/jobs';
    case 'open_chat':
      if (conversationId) return `/dashboard/messages?conversation=${conversationId}`;
      return jobId ? `/dashboard/messages?job=${jobId}` : '/dashboard/messages';
    case 'view_comment':
    case 'view_reply':
      return jobId ? `/jobs/${jobId}${commentId ? `#comment-${commentId}` : ''}` : '/dashboard';
    case 'view_dispute':
      return disputeId ? `/dashboard/disputes/${disputeId}` : '/dashboard/disputes';
    default:
      return '/dashboard';
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
