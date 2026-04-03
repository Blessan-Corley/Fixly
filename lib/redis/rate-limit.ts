import { logger } from '@/lib/logger';

import {
  ensureRedisConnection,
  getRedisClient,
  getRedisRecoveryRetrySeconds,
  shouldFailClosedForAuth,
} from './runtime';
import type { RedisRateLimitResult } from './types';

type RedisRateLimitOptions = {
  requireHealthyRedis?: boolean;
};

export async function redisRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
  namespace = 'rate_limit',
  options: RedisRateLimitOptions = {}
): Promise<RedisRateLimitResult> {
  try {
    const client = await ensureRedisConnection(getRedisClient());
    if (!client) {
      throw new Error('Redis client not available');
    }

    const redisKey = `${namespace}:${key}`;
    const now = Date.now();
    const count = await client.incr(redisKey);

    if (count === 1) {
      await client.expire(redisKey, windowSeconds);
    }

    const ttl = await client.ttl(redisKey);
    const normalizedTtl = ttl > 0 ? ttl : windowSeconds;

    if (ttl <= 0) {
      await client.expire(redisKey, windowSeconds);
    }

    const resetTime = now + normalizedTtl * 1000;

    if (count > maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime,
        retryAfter: normalizedTtl,
      };
    }

    return {
      success: true,
      remaining: Math.max(0, maxRequests - count),
      resetTime,
      fallback: false,
    };
  } catch (error: unknown) {
    if (shouldFailClosedForAuth() || options.requireHealthyRedis) {
      const retryAfter = getRedisRecoveryRetrySeconds();
      return {
        success: false,
        remaining: 0,
        resetTime: Date.now() + retryAfter * 1000,
        retryAfter,
        fallback: false,
        degraded: true,
        errorCode: 'REDIS_UNAVAILABLE',
      };
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      '[Redis] Rate limit error, failing open for non-critical endpoint'
    );

    return {
      success: true,
      remaining: maxRequests,
      resetTime: Date.now() + windowSeconds * 1000,
      fallback: false,
    };
  }
}
