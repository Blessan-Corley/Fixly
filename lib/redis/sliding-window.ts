import { randomUUID } from 'crypto';

import { logger } from '@/lib/logger';

import {
  ensureRedisConnection,
  getRedisClient,
  getRedisRecoveryRetrySeconds,
  shouldFailClosedForAuth,
} from './runtime';
import type { RedisRateLimitResult } from './types';

type SortedSetClient = {
  zremrangebyscore: (key: string, min: number | string, max: number | string) => Promise<unknown>;
  zadd: (key: string, score: number, member: string) => Promise<unknown>;
  zcard: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  zrange: (
    key: string,
    start: number,
    stop: number,
    withScores: 'WITHSCORES'
  ) => Promise<string[]>;
  zrem: (key: string, member: string) => Promise<unknown>;
};

function isSortedSetClient(value: unknown): value is SortedSetClient {
  if (!value || typeof value !== 'object') return false;
  return (
    'zremrangebyscore' in value &&
    typeof (value as Record<string, unknown>).zremrangebyscore === 'function' &&
    'zadd' in value &&
    typeof (value as Record<string, unknown>).zadd === 'function' &&
    'zcard' in value &&
    typeof (value as Record<string, unknown>).zcard === 'function' &&
    'expire' in value &&
    typeof (value as Record<string, unknown>).expire === 'function' &&
    'zrange' in value &&
    typeof (value as Record<string, unknown>).zrange === 'function' &&
    'zrem' in value &&
    typeof (value as Record<string, unknown>).zrem === 'function'
  );
}

/**
 * Sliding-window rate limiter using Redis sorted sets.
 *
 * Each request adds a timestamped member to a sorted set. Old members outside
 * the window are pruned before counting, giving exact per-window counts without
 * the boundary-burst problem of fixed-window counters.
 *
 * Fail behaviour:
 *   - Redis unavailable + shouldFailClosedForAuth() → degraded (blocked)
 *   - Redis unavailable + not fail-closed            → fail-open (allowed)
 */
export async function slidingWindowRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
  namespace = 'sw_rate_limit'
): Promise<RedisRateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  try {
    const rawClient = await ensureRedisConnection(getRedisClient());
    if (!rawClient || !isSortedSetClient(rawClient)) {
      throw new Error('Redis sorted-set client not available');
    }

    const redisKey = `${namespace}:${key}`;
    const member = `${now}:${randomUUID()}`;

    await rawClient.zremrangebyscore(redisKey, 0, windowStart);
    await rawClient.zadd(redisKey, now, member);
    await rawClient.expire(redisKey, windowSeconds);

    const count = await rawClient.zcard(redisKey);

    if (count > maxRequests) {
      await rawClient.zrem(redisKey, member);

      const oldest = await rawClient.zrange(redisKey, 0, 0, 'WITHSCORES');
      const oldestScore = oldest.length >= 2 ? Number(oldest[1]) : now;
      const retryAfter = Number.isFinite(oldestScore)
        ? Math.max(1, Math.ceil((oldestScore + windowMs - now) / 1000))
        : windowSeconds;

      return {
        success: false,
        remaining: 0,
        resetTime: now + retryAfter * 1000,
        retryAfter,
        fallback: false,
      };
    }

    return {
      success: true,
      remaining: Math.max(0, maxRequests - count),
      resetTime: now + windowMs,
      fallback: false,
    };
  } catch (error: unknown) {
    if (shouldFailClosedForAuth()) {
      const retryAfter = getRedisRecoveryRetrySeconds();
      return {
        success: false,
        remaining: 0,
        resetTime: now + retryAfter * 1000,
        retryAfter,
        fallback: false,
        degraded: true,
        errorCode: 'REDIS_UNAVAILABLE',
      };
    }

    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      '[Redis] Sliding window rate limit error, failing open'
    );

    return {
      success: true,
      remaining: maxRequests,
      resetTime: now + windowMs,
      fallback: false,
    };
  }
}
