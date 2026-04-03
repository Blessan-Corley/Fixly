import { z } from 'zod';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { badRequest, requireSession, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { getNotificationService } from '@/lib/services/notifications';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

type MarkNotificationsBody = {
  notificationId?: unknown;
  notificationIds?: unknown;
  markAll?: unknown;
};

const MarkNotificationsBodySchema = z.object({
  notificationId: z.unknown().optional(),
  notificationIds: z.unknown().optional(),
  markAll: z.unknown().optional(),
});

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<string>();
  for (const id of value) {
    const normalized = asString(id);
    if (normalized) set.add(normalized);
  }
  return Array.from(set);
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

async function fallbackMarkAsReadByLegacyIds(
  userId: string,
  idsToMark: string[]
): Promise<boolean> {
  if (idsToMark.length === 0) return false;

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user || !Array.isArray(user.notifications)) return false;

    let updated = false;
    const idsSet = new Set(idsToMark);

    for (const notification of user.notifications) {
      const primaryId = asString(notification?.id);
      const legacyId = asString(notification?._id?.toString?.() ?? notification?._id);
      if (idsSet.has(primaryId) || idsSet.has(legacyId)) {
        if (!notification.read) {
          notification.read = true;
          notification.readAt = new Date();
          updated = true;
        }
      }
    }

    if (!updated) return false;
    await user.save();
    return true;
  } catch (error) {
    logger.error('Fallback notification markAsRead failed:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'mark_read', 60, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, MarkNotificationsBodySchema);
    if ('error' in parsedBody) return parsedBody.error;
    const body: MarkNotificationsBody = parsedBody.data;

    const markAll = asBoolean(body.markAll);
    const singleId = asString(body.notificationId);
    const ids = normalizeIds(body.notificationIds);
    const idsToMark = markAll ? [] : ids.length > 0 ? ids : singleId ? [singleId] : [];

    if (!markAll && idsToMark.length === 0) {
      return badRequest('Notification ID, notificationIds, or markAll flag is required');
    }

    const notificationService = await getNotificationService();
    let success = await notificationService.markAsRead(userId, idsToMark);

    // Compatibility fallback for older notifications keyed by `_id` instead of `id`
    if (!success && !markAll && idsToMark.length > 0) {
      success = await fallbackMarkAsReadByLegacyIds(userId, idsToMark);
    }

    if (!success) {
      return serverError('Failed to mark notifications as read');
    }

    const unreadCount = await notificationService.getUnreadCount(userId);

    try {
      const cachePattern = `notifications:${userId}:*`;
      await redisUtils.invalidatePattern(cachePattern);
    } catch (cacheError: unknown) {
      const err = cacheError as Error;
      logger.info('Cache invalidation error:', err.message);
    }

    const response = respond({
      success: true,
      message: markAll
        ? 'All notifications marked as read'
        : ids.length > 0
          ? `${ids.length} notification(s) marked as read`
          : 'Notification marked as read',
      unreadCount,
    });

    if (markAll) {
      await publishToChannel(Channels.user(userId), Events.user.allNotificationsRead, {
        userId,
      });
    } else {
      await Promise.all(
        idsToMark.map((notificationId) =>
          publishToChannel(Channels.user(userId), Events.user.notificationRead, {
            notificationId,
          })
        )
      );
    }

    response.headers.set('Cache-Control', 'no-cache');
    return response;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Mark notification read error:', err);
    return serverError('Failed to mark notification as read');
  }
}
