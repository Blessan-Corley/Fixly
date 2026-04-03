import {
  Award,
  Briefcase,
  DollarSign,
  Info,
  MessageSquare,
  Shield,
  Star,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { NotificationCategory, NotificationPriority, NotificationRecord } from './notifications.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function toPriority(value: unknown): NotificationPriority {
  const normalized = asTrimmedString(value).toLowerCase();
  if (
    normalized === 'low' ||
    normalized === 'normal' ||
    normalized === 'medium' ||
    normalized === 'high' ||
    normalized === 'urgent'
  ) {
    return normalized;
  }

  return 'normal';
}

export function inferCategory(type: string, explicitCategory: string): NotificationCategory {
  const category = explicitCategory.toLowerCase();
  if (
    category === 'jobs' ||
    category === 'messages' ||
    category === 'payments' ||
    category === 'system' ||
    category === 'reviews' ||
    category === 'social'
  ) {
    return category;
  }

  if (
    [
      'job_application',
      'job_status_update',
      'job_completed',
      'job_cancelled',
      'job_applied',
      'application_accepted',
      'application_rejected',
      'job_assigned',
    ].includes(type)
  ) {
    return 'jobs';
  }

  if (['new_message', 'message_received', 'message'].includes(type)) {
    return 'messages';
  }

  if (['payment_success', 'payment_failed', 'payment_received'].includes(type)) {
    return 'payments';
  }

  if (['new_review', 'rating_update', 'review'].includes(type)) {
    return 'reviews';
  }

  if (['comment_like', 'profile_view'].includes(type)) {
    return 'social';
  }

  return 'system';
}

export function normalizeNotification(value: unknown, index: number): NotificationRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = asTrimmedString(value.type).toLowerCase() || 'account_update';
  const createdAtRaw = asTrimmedString(value.createdAt) || asTrimmedString(value.timestamp);
  const createdAt = createdAtRaw || new Date().toISOString();
  const title = asTrimmedString(value.title) || 'Notification';
  const message =
    asTrimmedString(value.message) || asTrimmedString(value.body) || 'No details available.';
  const id =
    asTrimmedString(value.id) ||
    asTrimmedString(value.messageId) ||
    asTrimmedString(value._id) ||
    `${type}:${createdAt}:${index}`;

  return {
    id,
    type,
    category: inferCategory(type, asTrimmedString(value.category)),
    title,
    message,
    read: value.read === true,
    readAt: asTrimmedString(value.readAt) || undefined,
    createdAt,
    priority: toPriority(value.priority),
    actionUrl: asTrimmedString(value.actionUrl) || undefined,
    data: isRecord(value.data) ? value.data : undefined,
  };
}

export function notificationIdentity(notification: NotificationRecord): string {
  return `${notification.id}:${notification.type}:${notification.createdAt}`;
}

export function formatRelativeTime(dateValue: string): string {
  const now = Date.now();
  const timestamp = new Date(dateValue).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export function iconForType(type: string): ReactNode {
  const iconClassName = 'h-5 w-5';

  switch (type) {
    case 'job_application':
    case 'job_status_update':
    case 'job_completed':
    case 'job_cancelled':
    case 'job_applied':
    case 'application_accepted':
    case 'application_rejected':
      return <Briefcase className={iconClassName} />;
    case 'new_message':
    case 'message_received':
    case 'message':
      return <MessageSquare className={iconClassName} />;
    case 'payment_success':
    case 'payment_failed':
    case 'payment_received':
      return <DollarSign className={iconClassName} />;
    case 'new_review':
    case 'rating_update':
      return <Star className={iconClassName} />;
    case 'verification_update':
      return <Shield className={iconClassName} />;
    case 'promotion':
      return <Zap className={iconClassName} />;
    case 'achievement':
      return <Award className={iconClassName} />;
    default:
      return <Info className={iconClassName} />;
  }
}

export function styleForType(type: string): string {
  switch (type) {
    case 'job_application':
    case 'job_status_update':
    case 'job_completed':
    case 'job_cancelled':
    case 'job_applied':
    case 'application_accepted':
    case 'application_rejected':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'new_message':
    case 'message_received':
    case 'message':
      return 'bg-fixly-accent/10 text-fixly-primary border-fixly-accent/30';
    case 'payment_success':
    case 'payment_received':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'payment_failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'new_review':
    case 'rating_update':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}
