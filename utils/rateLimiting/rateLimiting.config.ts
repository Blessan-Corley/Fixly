import type { RateLimitConfig } from './rateLimiting.types';

export const rateLimitConfig = {
  login_attempts: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDuration: 30 * 60 * 1000,
  },
  job_posting: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockDuration: 6 * 60 * 60 * 1000,
  },
  api_requests: {
    maxAttempts: 1000,
    windowMs: 15 * 60 * 1000,
    blockDuration: 5 * 60 * 1000,
  },
  password_reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,
    blockDuration: 24 * 60 * 60 * 1000,
  },
  email_verification: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockDuration: 24 * 60 * 60 * 1000,
  },
  file_upload: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000,
    blockDuration: 6 * 60 * 60 * 1000,
  },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitType = keyof typeof rateLimitConfig | string;

export function getConfig(type: RateLimitType, maxAttempts?: number, windowMs?: number): RateLimitConfig {
  const predefined = rateLimitConfig[type as keyof typeof rateLimitConfig];
  if (predefined) return predefined;

  const resolvedWindow = typeof windowMs === 'number' && windowMs > 0 ? windowMs : 15 * 60 * 1000;
  const resolvedAttempts = typeof maxAttempts === 'number' && maxAttempts > 0 ? maxAttempts : 5;

  return {
    maxAttempts: resolvedAttempts,
    windowMs: resolvedWindow,
    blockDuration: resolvedWindow * 2,
  };
}
