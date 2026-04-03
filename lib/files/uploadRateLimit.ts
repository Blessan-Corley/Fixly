// Phase 2: Added Redis-backed sliding-window rate limiting for user uploads.
import { randomUUID } from 'node:crypto';

import { getRedis, redisRateLimit } from '@/lib/redis';

const UPLOAD_WINDOW_SECONDS = 60 * 60;
const UPLOAD_WINDOW_MS = UPLOAD_WINDOW_SECONDS * 1000;
const MAX_UPLOADS_PER_WINDOW = 20;

type SortedSetRedisClient = {
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

export type UploadRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  resetTime: number;
  degraded?: boolean;
};

function isSortedSetRedisClient(value: unknown): value is SortedSetRedisClient {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    'zremrangebyscore' in value &&
    typeof value.zremrangebyscore === 'function' &&
    'zadd' in value &&
    typeof value.zadd === 'function' &&
    'zcard' in value &&
    typeof value.zcard === 'function' &&
    'expire' in value &&
    typeof value.expire === 'function' &&
    'zrange' in value &&
    typeof value.zrange === 'function' &&
    'zrem' in value &&
    typeof value.zrem === 'function'
  );
}

export async function enforceUploadRateLimit(userId: string): Promise<UploadRateLimitResult> {
  const now = Date.now();
  const resetTime = now + UPLOAD_WINDOW_MS;
  const client = getRedis();

  if (!isSortedSetRedisClient(client)) {
    const fallback = await redisRateLimit(
      userId,
      MAX_UPLOADS_PER_WINDOW,
      UPLOAD_WINDOW_SECONDS,
      'upload_rate'
    );
    return {
      allowed: fallback.success,
      remaining: fallback.remaining ?? 0,
      retryAfter: fallback.retryAfter,
      resetTime: fallback.resetTime,
      degraded: fallback.fallback || fallback.degraded,
    };
  }

  const key = `upload_rate:${userId}`;
  const member = `${now}:${randomUUID()}`;
  const windowStart = now - UPLOAD_WINDOW_MS;

  await client.zremrangebyscore(key, 0, windowStart);
  await client.zadd(key, now, member);
  await client.expire(key, UPLOAD_WINDOW_SECONDS);

  const count = await client.zcard(key);
  if (count > MAX_UPLOADS_PER_WINDOW) {
    await client.zrem(key, member);

    const oldestEntry = await client.zrange(key, 0, 0, 'WITHSCORES');
    const oldestScore = oldestEntry.length >= 2 ? Number(oldestEntry[1]) : now;
    const retryAfter = Number.isFinite(oldestScore)
      ? Math.max(1, Math.ceil((oldestScore + UPLOAD_WINDOW_MS - now) / 1000))
      : UPLOAD_WINDOW_SECONDS;

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      resetTime: now + retryAfter * 1000,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_UPLOADS_PER_WINDOW - count),
    resetTime,
  };
}
