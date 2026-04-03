import { respond, requireSession, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { getNotificationService, NOTIFICATION_CATEGORIES } from '@/lib/services/notifications';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asTrimmedString,
  CACHE_KEY_PREFIX,
  CACHE_TTL,
  parsePositiveInt,
  parseCachedNotifications,
} from './shared';

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'notifications', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    const searchParams = new URL(request.url).searchParams;
    const page = parsePositiveInt(searchParams.get('page'), 1, 1, 10000);
    const limit = parsePositiveInt(searchParams.get('limit'), 20, 1, 50);
    const offset = (page - 1) * limit;
    const status = asTrimmedString(searchParams.get('status')).toLowerCase();
    const unreadOnly = searchParams.get('unreadOnly') === 'true' || status === 'unread';
    const category = asTrimmedString(searchParams.get('category')).toLowerCase();
    const type = asTrimmedString(searchParams.get('type')).toLowerCase();
    const search = asTrimmedString(searchParams.get('search'));
    const since = asTrimmedString(searchParams.get('since'));

    const cacheKey = `${CACHE_KEY_PREFIX}${userId}:${page}:${limit}:${unreadOnly}:${category || 'all'}:${type || 'all'}:${search || 'all'}:${since || 'all'}`;

    try {
      const cachedData = parseCachedNotifications(await redisUtils.get(cacheKey));
      if (cachedData) {
        const response = respond(cachedData);
        response.headers.set('X-Cache', 'HIT');
        response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
        return response;
      }
    } catch (cacheError: unknown) {
      logger.info('Cache miss or error:', (cacheError as Error).message);
    }

    const notificationService = await getNotificationService();
    const result = await notificationService.getUserNotifications(userId, {
      limit,
      offset,
      category: category || undefined,
      type: type || undefined,
      search: search || undefined,
      unreadOnly,
    });

    const responseData = {
      notifications: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasMore: result.hasMore,
      },
      unreadCount: result.unreadCount,
      categories: Object.values(NOTIFICATION_CATEGORIES),
      timestamp: Date.now(),
    };

    try {
      await redisUtils.set(cacheKey, responseData, CACHE_TTL);
    } catch (cacheError: unknown) {
      logger.info('Cache set error:', (cacheError as Error).message);
    }

    const response = respond(responseData);
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (error: unknown) {
    logger.error('Get notifications error:', error as Error);
    return serverError('Failed to fetch notifications');
  }
}
