import type Redis from 'ioredis';

export type RedisClient = Redis | null;

export interface RedisRuntimeState {
  client: RedisClient;
  isHealthy: boolean;
  lastHealthCheck: number;
  initAttempted: boolean;
  missingConfigLogged: boolean;
  disabledUntil: number;
  lastErrorMessage: string | null;
  lastErrorAt: number;
  lastUnavailableWarningAt: number;
}

export interface RedisRateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  fallback?: boolean;
  degraded?: boolean;
  errorCode?: 'REDIS_UNAVAILABLE';
}

export type RedisScanResult = {
  cursor?: unknown;
  keys?: unknown;
  nextCursor?: unknown;
  result?: unknown;
};
