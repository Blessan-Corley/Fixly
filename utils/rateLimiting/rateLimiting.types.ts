export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDuration: number;
}

export interface RedisRateLimitResult {
  success: boolean;
  remaining?: number;
  resetTime: number;
  retryAfter?: number;
  fallback?: boolean;
  degraded?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  remainingAttempts: number;
  resetTime: number;
  remainingTime?: number;
  isBlocked?: boolean;
  message?: string;
  degraded?: boolean;
}

export interface RateLimitOptions {
  requireRedis?: boolean;
}

export type RateLimitRuntimeState = {
  useRedis: boolean | null;
  lastRedisCheck: number;
  lastRedisFallbackWarning: number;
};
