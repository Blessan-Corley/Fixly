import { NextResponse } from 'next/server';

import { getConfig } from './rateLimiting/rateLimiting.config';
import type { RateLimitType } from './rateLimiting/rateLimiting.config';
import { rateLimit } from './rateLimiting/rateLimiting.core';
import { runtimeState } from './rateLimiting/rateLimiting.store';

export { rateLimitConfig } from './rateLimiting/rateLimiting.config';
export type { RateLimitType } from './rateLimiting/rateLimiting.config';
export { rateLimit } from './rateLimiting/rateLimiting.core';
export type { RateLimitResult, RateLimitOptions } from './rateLimiting/rateLimiting.types';

export function withRateLimit(type: RateLimitType, maxAttempts?: number, windowMs?: number) {
  return async function rateLimitMiddleware(request: Request): Promise<NextResponse | null> {
    const config = getConfig(type, maxAttempts, windowMs);
    const result = await rateLimit(request, type, config.maxAttempts, config.windowMs);

    if (!result.success) {
      const remainingTime = result.remainingTime ?? Math.max(0, result.resetTime - Date.now());
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: result.message,
          remainingTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(config.maxAttempts),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + remainingTime).toISOString(),
            'Retry-After': String(Math.max(1, Math.ceil(remainingTime / 1000))),
          },
        }
      );
    }

    return null;
  };
}

/** Reset Redis availability cache — for use in tests only */
export function resetRateLimitRuntimeState(): void {
  runtimeState.useRedis = null;
  runtimeState.lastRedisCheck = 0;
  runtimeState.lastRedisFallbackWarning = 0;
}
