import { can } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import { NOTIFICATION_TYPES, NotificationService } from '@/lib/services/notifications';

export type SessionUser = {
  id: string;
  name?: string;
  role?: string;
};

export type RouteContext = {
  params: Promise<{
    disputeId: string;
  }>;
};

export type NotificationPayload = {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

export type DisputeAccessShape = {
  initiatedBy?: unknown;
  againstUser?: unknown;
  assignedModerator?: unknown;
};

export function toIdString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

export function canAccessDispute(dispute: DisputeAccessShape, user: SessionUser): boolean {
  const initiatedBy = toIdString(dispute.initiatedBy);
  const againstUser = toIdString(dispute.againstUser);
  const assignedModerator = toIdString(dispute.assignedModerator);

  return (
    initiatedBy === user.id ||
    againstUser === user.id ||
    can(user, 'moderate', 'dispute') ||
    (!!assignedModerator && assignedModerator === user.id)
  );
}

export async function sendNotifications(notifications: NotificationPayload[]): Promise<void> {
  if (!notifications.length) return;

  const deduped = new Map<string, NotificationPayload>();
  notifications.forEach((notification) => {
    if (!notification.userId) return;
    deduped.set(
      `${notification.userId}:${notification.title}:${notification.message}`,
      notification
    );
  });

  await Promise.all(
    Array.from(deduped.values()).map(async (notification) => {
      try {
        const actionUrl =
          typeof notification.data?.actionUrl === 'string'
            ? notification.data.actionUrl
            : '/dashboard/disputes';
        await NotificationService.createNotification(
          notification.userId,
          NOTIFICATION_TYPES.DISPUTE,
          notification.title,
          notification.message,
          actionUrl,
          notification.data || {}
        );
      } catch (error) {
        logger.error('Failed to send dispute notification:', error);
      }
    })
  );
}
