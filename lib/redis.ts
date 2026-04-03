import { HEALTH_CHECK_INTERVAL_MS } from './redis/constants';
import { redisRateLimit as redisRateLimitImpl } from './redis/rate-limit';
import {
  ensureRedisConnection,
  getRedisClient,
  getRedisRecoveryRetrySeconds,
  initRedisClient,
  isAuthRedisDegraded,
  isRedisConfigured,
  redisState,
  shouldAllowInMemoryAuthFallback,
  shouldFailClosedForAuth,
} from './redis/runtime';
import { slidingWindowRateLimit as slidingWindowRateLimitImpl } from './redis/sliding-window';
import type { RedisRateLimitResult } from './redis/types';
import { redisUtils as redisUtilsImpl } from './redis/utils';

interface SessionRedisApi {
  get: typeof redisUtils.get;
  set: typeof redisUtils.set;
  del: typeof redisUtils.del;
  exists: typeof redisUtils.exists;
}

export const redisRateLimit = redisRateLimitImpl;

/**
 * Fixed-window rate limit for auth endpoints — fail-closed when Redis is unavailable.
 * @deprecated Prefer authSlidingRateLimit which eliminates boundary-burst attacks.
 */
export const authRedisRateLimit = (
  key: string,
  maxRequests: number,
  windowSeconds: number,
  namespace = 'rate_limit'
): Promise<RedisRateLimitResult> =>
  redisRateLimitImpl(key, maxRequests, windowSeconds, namespace, {
    requireHealthyRedis: true,
  });

/**
 * Sliding-window rate limit for auth/security-critical endpoints.
 * Uses Redis sorted sets for exact per-window counting with no boundary burst.
 * Fail-closed in production: returns degraded when Redis is unavailable.
 */
export const authSlidingRateLimit = (
  key: string,
  maxRequests: number,
  windowSeconds: number,
  namespace = 'sw_auth'
): Promise<RedisRateLimitResult> =>
  slidingWindowRateLimitImpl(key, maxRequests, windowSeconds, namespace);

export const redisUtils = redisUtilsImpl;

export let redis = redisState.client;

export const initRedis = () => {
  redis = initRedisClient();
  return redis;
};

export const getRedis = () => {
  redis = getRedisClient();
  return redis;
};

export const checkRedisHealth = async (): Promise<boolean> => {
  const now = Date.now();

  if (redisState.disabledUntil > now) {
    redisState.isHealthy = false;
    redisState.lastHealthCheck = now;
    return false;
  }

  if (now - redisState.lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
    return redisState.isHealthy;
  }

  try {
    const client = await ensureRedisConnection(getRedis());
    if (!client) {
      redisState.isHealthy = false;
      redisState.lastHealthCheck = now;
      return false;
    }

    const result = await client.ping();
    redisState.isHealthy = result === 'PONG';
    redisState.lastHealthCheck = now;

    return redisState.isHealthy;
  } catch (error) {
    redisState.isHealthy = false;
    redisState.lastHealthCheck = now;
    return false;
  }
};

export const sessionRedis: SessionRedisApi = {
  get: redisUtils.get,
  set: redisUtils.set,
  del: redisUtils.del,
  exists: redisUtils.exists,
};

export type { RedisRateLimitResult };
export {
  getRedisRecoveryRetrySeconds,
  isAuthRedisDegraded,
  isRedisConfigured,
  shouldAllowInMemoryAuthFallback,
  shouldFailClosedForAuth,
};

const redisApi = {
  initRedis,
  getRedis,
  checkRedisHealth,
  redisRateLimit,
  authRedisRateLimit,
  authSlidingRateLimit,
  redisUtils,
  sessionRedis,
  isAuthRedisDegraded,
  shouldFailClosedForAuth,
  shouldAllowInMemoryAuthFallback,
  getRedisRecoveryRetrySeconds,
};

export default redisApi;
