import crypto from 'crypto';

import { logger } from '@/lib/logger';
import { withServiceFallback } from '@/lib/resilience/serviceGuard';

import { redisUtils } from './redis';
import {
  buildCacheControlHeader,
  getCacheConfig,
  shouldBypassRequestCache,
  shouldCacheResponse,
  toCacheKeySegment,
  toCachePatternSegment,
  type CacheConfig,
  type CacheContext,
  type CacheHandler,
  type CachePayload,
} from './redisCache.config';

export { CACHE_CONFIGS } from './redisCache.config';

export function withCache<TContext extends CacheContext = CacheContext>(
  handler: CacheHandler<TContext>,
  customConfig: Partial<CacheConfig> = {}
): CacheHandler<TContext> {
  return async (request: Request, context: TContext) => {
    if (request.method !== 'GET' || shouldBypassRequestCache(request)) {
      return handler(request, context);
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const config = { ...getCacheConfig(pathname), ...customConfig };
      const userIdHeader = config.userSpecific ? request.headers.get('x-user-id') : null;

      if (config.userSpecific && !userIdHeader) {
        // Avoid cross-user cache reuse when user-specific endpoints are called without an identity header.
        return handler(request, context);
      }

      const keyComponents = {
        version: config.version,
        pathname,
        query: Object.fromEntries(
          Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b))
        ),
        ...(config.userSpecific && userIdHeader ? { userId: userIdHeader } : {}),
      };

      let prefix = `cache:${config.version}:${toCacheKeySegment(pathname)}`;
      if (config.userSpecific && userIdHeader) {
        prefix += `:user:${toCacheKeySegment(userIdHeader)}`;
      }

      const hash = crypto.createHash('sha256').update(JSON.stringify(keyComponents)).digest('hex');
      const truncatedPrefix = prefix.length > 140 ? prefix.substring(0, 140) : prefix;
      const cacheKey = `${truncatedPrefix}:${hash.substring(0, 16)}`;

      const cached = await withServiceFallback(
        () => redisUtils.get<CachePayload | string>(cacheKey),
        null,
        'redis-cache-get'
      );
      if (cached) {
        const data = typeof cached === 'string' ? (JSON.parse(cached) as CachePayload) : cached;
        const headers = new Headers({
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': buildCacheControlHeader(config),
          ...(config.userSpecific ? { Vary: 'x-user-id' } : {}),
        });
        return new Response(JSON.stringify(data.body), { status: data.status || 200, headers });
      }

      const response = await handler(request, context);

      if (shouldCacheResponse(response)) {
        try {
          const body = (await response.clone().json()) as unknown;
          const cacheData: CachePayload = { status: response.status, body, cachedAt: new Date().toISOString() };
          await withServiceFallback(
            () => redisUtils.set(cacheKey, cacheData, config.ttl),
            false,
            'redis-cache-set'
          );
        } catch (cacheError: unknown) {
          logger.error('Cache set error:', cacheError);
        }
      }

      if (!response.headers.has('X-Cache')) response.headers.set('X-Cache', 'MISS');
      if (!response.headers.has('Cache-Control')) response.headers.set('Cache-Control', buildCacheControlHeader(config));
      if (config.userSpecific && !response.headers.has('Vary')) response.headers.set('Vary', 'x-user-id');

      return response;
    } catch (error: unknown) {
      logger.error('Cache wrapper error:', error);
      return handler(request, context);
    }
  };
}

export async function invalidateCache(pattern: string): Promise<boolean> {
  try {
    const normalizedPattern = toCachePatternSegment(pattern);
    return await withServiceFallback(
      () => redisUtils.invalidatePattern(`cache:*:${normalizedPattern}*`),
      false,
      'redis-cache-invalidate-pattern'
    );
  } catch (error: unknown) {
    logger.error('Cache invalidation error:', error);
    return false;
  }
}

export async function invalidateUserCache(userId: string, endpoint: string | null = null): Promise<boolean> {
  try {
    const normalizedUserId = toCachePatternSegment(userId);
    const pattern = endpoint
      ? `cache:*:${toCachePatternSegment(endpoint)}:user:${normalizedUserId}:*`
      : `cache:*:*:user:${normalizedUserId}:*`;
    return await withServiceFallback(
      () => redisUtils.invalidatePattern(pattern),
      false,
      'redis-user-cache-invalidate'
    );
  } catch (error: unknown) {
    logger.error('User cache invalidation error:', error);
    return false;
  }
}
