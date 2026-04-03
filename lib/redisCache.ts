/**
 * Redis Caching Middleware
 * Comprehensive caching solution for API responses
 * Uses shared Redis client from lib/redis
 */

import crypto from 'crypto';

import { logger } from '@/lib/logger';
import { withServiceFallback } from '@/lib/resilience/serviceGuard';

import { redisUtils } from './redis';

type CacheConfig = {
  ttl: number;
  version: string;
  userSpecific?: boolean;
};

type CacheConfigMap = Record<string, CacheConfig>;

type CacheContext = Record<string, unknown>;

type CacheHandler<TContext extends CacheContext = CacheContext> = (
  request: Request,
  context: TContext
) => Promise<Response> | Response;

type CachePayload = {
  status: number;
  body: unknown;
  cachedAt: string;
};

function toCacheKeySegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '_');
}

function toCachePatternSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9*]/g, '_');
}

function buildCacheControlHeader(config: CacheConfig): string {
  return config.userSpecific ? `private, max-age=${config.ttl}` : `public, max-age=${config.ttl}`;
}

function shouldBypassRequestCache(request: Request): boolean {
  const cacheControl = request.headers.get('cache-control')?.toLowerCase() ?? '';
  const pragma = request.headers.get('pragma')?.toLowerCase() ?? '';
  return (
    cacheControl.includes('no-cache') ||
    cacheControl.includes('no-store') ||
    pragma.includes('no-cache')
  );
}

function shouldCacheResponse(response: Response): boolean {
  if (!(response.status >= 200 && response.status < 300)) {
    return false;
  }

  const cacheControl = response.headers.get('cache-control')?.toLowerCase() ?? '';
  if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) {
    return false;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.includes('application/json');
}

export const CACHE_CONFIGS: CacheConfigMap = {
  '/api/skills': { ttl: 7 * 24 * 60 * 60, version: 'v1' },
  '/api/categories': { ttl: 7 * 24 * 60 * 60, version: 'v1' },
  '/api/location/cities': { ttl: 24 * 60 * 60, version: 'v1' },
  '/api/user/profile': { ttl: 15 * 60, version: 'v1', userSpecific: true },
  '/api/user/ratings': { ttl: 60 * 60, version: 'v1', userSpecific: true },
  '/api/user/reviews': { ttl: 30 * 60, version: 'v1', userSpecific: true },
  '/api/jobs/browse': { ttl: 5 * 60, version: 'v1' },
  '/api/jobs/search': { ttl: 10 * 60, version: 'v1' },
  '/api/jobs/[id]': { ttl: 15 * 60, version: 'v1' },
  '/api/jobs/applications': { ttl: 2 * 60, version: 'v1', userSpecific: true },
  '/api/stats/dashboard': { ttl: 60 * 60, version: 'v1', userSpecific: true },
  '/api/stats/public': { ttl: 6 * 60 * 60, version: 'v1' },
  default: { ttl: 5 * 60, version: 'v1' },
};

function getCacheConfig(pathname: string): CacheConfig {
  if (CACHE_CONFIGS[pathname]) {
    return CACHE_CONFIGS[pathname];
  }

  for (const [pattern, config] of Object.entries(CACHE_CONFIGS)) {
    if (!pattern.includes('[')) {
      continue;
    }

    const escaped = pattern.replace(/[.*+?^${}()|\\]/g, '\\$&');
    const regexStr = escaped.replace(/\\\[.*?\\\]/g, '[^/]+');

    try {
      if (pathname.match(new RegExp(`^${regexStr}$`))) {
        return config;
      }
    } catch {
      // Ignore invalid pattern and continue.
    }
  }

  return CACHE_CONFIGS.default;
}

export function withCache<TContext extends CacheContext = CacheContext>(
  handler: CacheHandler<TContext>,
  customConfig: Partial<CacheConfig> = {}
): CacheHandler<TContext> {
  return async (request: Request, context: TContext) => {
    if (request.method !== 'GET') {
      return handler(request, context);
    }

    if (shouldBypassRequestCache(request)) {
      return handler(request, context);
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const config = { ...getCacheConfig(pathname), ...customConfig };
      const userIdHeader = config.userSpecific ? request.headers.get('x-user-id') : null;

      const keyComponents: {
        version: string;
        pathname: string;
        query: Record<string, string>;
        userId?: string;
      } = {
        version: config.version,
        pathname,
        query: Object.fromEntries(
          Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b))
        ),
      };

      if (config.userSpecific && userIdHeader) {
        keyComponents.userId = userIdHeader;
      }

      let prefix = `cache:${config.version}:${toCacheKeySegment(pathname)}`;
      if (config.userSpecific && userIdHeader) {
        prefix += `:user:${toCacheKeySegment(userIdHeader)}`;
      } else if (config.userSpecific) {
        // Avoid cross-user cache reuse when user-specific endpoints are called without an identity header.
        return handler(request, context);
      }

      const keyString = JSON.stringify(keyComponents);
      const hash = crypto.createHash('sha256').update(keyString).digest('hex');
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
        });

        if (config.userSpecific) {
          headers.set('Vary', 'x-user-id');
        }

        return new Response(JSON.stringify(data.body), {
          status: data.status || 200,
          headers,
        });
      }

      const response = await handler(request, context);

      if (shouldCacheResponse(response)) {
        try {
          const clonedResponse = response.clone();
          const body = (await clonedResponse.json()) as unknown;
          const cacheData: CachePayload = {
            status: response.status,
            body,
            cachedAt: new Date().toISOString(),
          };
          await withServiceFallback(
            () => redisUtils.set(cacheKey, cacheData, config.ttl),
            false,
            'redis-cache-set'
          );
        } catch (cacheError: unknown) {
          logger.error('Cache set error:', cacheError);
        }
      }

      if (!response.headers.has('X-Cache')) {
        response.headers.set('X-Cache', 'MISS');
      }
      if (!response.headers.has('Cache-Control')) {
        response.headers.set('Cache-Control', buildCacheControlHeader(config));
      }
      if (config.userSpecific && !response.headers.has('Vary')) {
        response.headers.set('Vary', 'x-user-id');
      }

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

export async function invalidateUserCache(
  userId: string,
  endpoint: string | null = null
): Promise<boolean> {
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
