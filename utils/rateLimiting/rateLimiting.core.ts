import { logger } from '@/lib/logger';
import { getRedisRecoveryRetrySeconds, redisRateLimit, shouldFailClosedForAuth } from '@/lib/redis';

import { getConfig } from './rateLimiting.config';
import type { RateLimitType } from './rateLimiting.config';
import { checkRedisAvailability, getClientIP, runtimeState } from './rateLimiting.store';
import type { RedisRateLimitResult, RateLimitOptions, RateLimitResult } from './rateLimiting.types';

export async function rateLimit(
  request: Request,
  type: RateLimitType,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  try {
    const clientIP = getClientIP(request);
    const key = `${type}:${clientIP}`;
    const config = getConfig(type, maxAttempts, windowMs);
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    if (await checkRedisAvailability()) {
      const redisResult = (await redisRateLimit(
        key,
        config.maxAttempts,
        windowSeconds,
        'rate_limit',
        options.requireRedis ? { requireHealthyRedis: true } : undefined
      )) as RedisRateLimitResult;

      if (redisResult.degraded) {
        const retryAfter = redisResult.retryAfter ?? getRedisRecoveryRetrySeconds();
        return {
          success: false,
          remainingAttempts: 0,
          resetTime: redisResult.resetTime,
          remainingTime: retryAfter * 1000,
          isBlocked: true,
          degraded: true,
          message: 'Security service temporarily unavailable. Please try again shortly.',
        };
      }

      const remainingTime =
        typeof redisResult.retryAfter === 'number'
          ? redisResult.retryAfter * 1000
          : Math.max(0, redisResult.resetTime - Date.now());

      return {
        success: redisResult.success,
        remainingAttempts:
          typeof redisResult.remaining === 'number' ? redisResult.remaining : config.maxAttempts,
        resetTime: redisResult.resetTime,
        remainingTime,
        isBlocked: !redisResult.success,
        message: redisResult.success
          ? `Request allowed. ${redisResult.remaining ?? 0} attempts remaining.`
          : `Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000 / 60)} minutes.`,
      };
    }

    // Redis unavailable — fail-closed for requireRedis endpoints and auth-critical paths
    if (options.requireRedis || shouldFailClosedForAuth()) {
      const retryAfter = getRedisRecoveryRetrySeconds();
      return {
        success: false,
        remainingAttempts: 0,
        resetTime: Date.now() + retryAfter * 1000,
        remainingTime: retryAfter * 1000,
        isBlocked: true,
        degraded: true,
        message: 'Rate limiting service temporarily unavailable. Please try again shortly.',
      };
    }

    // Fail-open for non-critical endpoints (e.g. search, public reads)
    logger.warn('[RateLimit] Redis unavailable, failing open for non-critical endpoint');
    return {
      success: true,
      remainingAttempts: config.maxAttempts,
      resetTime: Date.now() + config.windowMs,
    };
  } catch (error) {
    logger.error('Rate limiting error:', error);
    if (options.requireRedis || shouldFailClosedForAuth()) {
      const retryAfter = getRedisRecoveryRetrySeconds();
      return {
        success: false,
        remainingAttempts: 0,
        resetTime: Date.now() + retryAfter * 1000,
        remainingTime: retryAfter * 1000,
        isBlocked: true,
        degraded: true,
        message: 'Rate limiting service temporarily unavailable. Please try again shortly.',
      };
    }
    return {
      success: true,
      remainingAttempts: maxAttempts,
      resetTime: Date.now() + windowMs,
    };
  }
}

export { runtimeState };
