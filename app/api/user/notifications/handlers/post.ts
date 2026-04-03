import { Channels as TypedChannels, Events as TypedEvents } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import {
  badRequest,
  forbidden,
  notFound,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { canTargetUser } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { getNotificationService, NOTIFICATION_TYPES } from '@/lib/services/notifications';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asTrimmedString,
  CACHE_KEY_PREFIX,
  CreateNotificationBodySchema,
  normalizeNotificationType,
  normalizePriority,
  type CreateNotificationBody,
} from './shared';

export async function POST(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'create_notification', 60, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const sessionLike = {
      user: {
        id: userId,
        role: typeof auth.session.user.role === 'string' ? auth.session.user.role : null,
      },
    };
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, CreateNotificationBodySchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }
    const body: CreateNotificationBody = parsedBody.data;

    const legacyType = asTrimmedString(body.type).toLowerCase();
    const title = asTrimmedString(body.title);
    const message = asTrimmedString(body.message);
    const actionUrl = asTrimmedString(body.actionUrl) || undefined;
    const requestedTargetUserId = asTrimmedString(body.targetUserId ?? body.userId);
    const targetUserId = requestedTargetUserId || userId;
    const unifiedType = normalizeNotificationType(legacyType) ?? NOTIFICATION_TYPES.ACCOUNT_UPDATE;

    if (requestedTargetUserId && !canTargetUser(sessionLike, targetUserId)) {
      return forbidden('Cannot create notifications for other users');
    }

    if (!title || !message) {
      return badRequest('Title and message are required');
    }

    for (const field of [
      { label: 'Notification title', value: title },
      { label: 'Notification message', value: message },
    ]) {
      const moderation = await moderateUserGeneratedContent(field.value, {
        context: 'notification',
        fieldLabel: field.label,
        userId,
      });

      if (!moderation.allowed) {
        return badRequest(moderation.message ?? 'Content validation failed', {
          violations: moderation.violations,
          suggestions: moderation.suggestions,
        });
      }
    }

    await connectDB();
    const userExists = await User.exists({ _id: targetUserId });
    if (!userExists) {
      return notFound('User');
    }

    const notificationService = await getNotificationService();
    const payloadData =
      body.data && typeof body.data === 'object' && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : {};

    const notification = await notificationService.createNotification({
      userId: targetUserId,
      type: unifiedType,
      data: {
        ...payloadData,
        type: legacyType || unifiedType,
        title,
        message,
        actionUrl,
      },
      priority: normalizePriority(body.priority, unifiedType),
    });

    if (!notification) {
      return respond(
        {
          success: false,
          message:
            'Notification was suppressed by user preferences or target user is unavailable',
        },
        200
      );
    }

    try {
      const cachePattern = `${CACHE_KEY_PREFIX}${targetUserId}:*`;
      await redisUtils.invalidatePattern(cachePattern);
    } catch (cacheError: unknown) {
      logger.info('Cache invalidation error:', (cacheError as Error).message);
    }

    await publishToChannel(TypedChannels.user(targetUserId), TypedEvents.user.notificationSent, {
      notificationId:
        (notification && typeof notification === 'object' && 'id' in notification
          ? String(notification.id)
          : undefined) ?? `${targetUserId}:${Date.now()}`,
      type: legacyType || unifiedType,
      title,
      message,
      link: actionUrl,
      createdAt: new Date().toISOString(),
    });

    return respond(
      {
        success: true,
        notification,
        message: 'Notification created successfully',
      },
      201
    );
  } catch (error: unknown) {
    logger.error('Create notification error:', error as Error);
    return serverError('Failed to create notification');
  }
}
