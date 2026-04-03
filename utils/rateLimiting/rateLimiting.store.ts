import { logger } from '@/lib/logger';
import { checkRedisHealth } from '@/lib/redis';

import type { RateLimitRuntimeState } from './rateLimiting.types';

declare global {
  // eslint-disable-next-line no-var
  var fixlyRateLimitRuntimeState: RateLimitRuntimeState | undefined;
}

export const REDIS_CHECK_INTERVAL = 30_000;
const REDIS_RETRY_INTERVAL_WHEN_UNHEALTHY = 5_000;

export const runtimeState: RateLimitRuntimeState = globalThis.fixlyRateLimitRuntimeState ?? {
  useRedis: null,
  lastRedisCheck: 0,
  lastRedisFallbackWarning: 0,
};

globalThis.fixlyRateLimitRuntimeState = runtimeState;

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;

  return '127.0.0.1';
}

export async function checkRedisAvailability(): Promise<boolean> {
  const now = Date.now();
  const checkInterval =
    runtimeState.useRedis === false ? REDIS_RETRY_INTERVAL_WHEN_UNHEALTHY : REDIS_CHECK_INTERVAL;

  if (runtimeState.useRedis !== null && now - runtimeState.lastRedisCheck < checkInterval) {
    return runtimeState.useRedis;
  }

  try {
    runtimeState.useRedis = await checkRedisHealth();
    if (!runtimeState.useRedis) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      runtimeState.useRedis = await checkRedisHealth();
    }
    runtimeState.lastRedisCheck = now;

    if (
      !runtimeState.useRedis &&
      now - runtimeState.lastRedisFallbackWarning >= REDIS_CHECK_INTERVAL
    ) {
      logger.warn('[RateLimit] Redis unavailable, rate limiting will fail-open for non-critical endpoints');
      runtimeState.lastRedisFallbackWarning = now;
    }

    return runtimeState.useRedis;
  } catch (error: unknown) {
    logger.error('Error checking Redis availability:', error);
    runtimeState.useRedis = false;
    runtimeState.lastRedisCheck = now;
    return false;
  }
}
