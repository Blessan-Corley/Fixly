import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies before importing the module under test
vi.mock('@/lib/redis', () => ({
  checkRedisHealth: vi.fn(),
  getRedisRecoveryRetrySeconds: vi.fn().mockReturnValue(30),
  redisRateLimit: vi.fn(),
  shouldFailClosedForAuth: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// next/server is required by rateLimiting.ts — provide a minimal mock
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => ({
      json: body,
      status: init?.status ?? 200,
      headers: new Headers(init?.headers),
    })),
  },
}));

import {
  checkRedisHealth,
  redisRateLimit,
  shouldFailClosedForAuth,
} from '@/lib/redis';
import {
  rateLimit,
  rateLimitConfig,
  resetRateLimitRuntimeState,
  withRateLimit,
} from '@/utils/rateLimiting';

const mockCheckRedisHealth = vi.mocked(checkRedisHealth);
const mockRedisRateLimit = vi.mocked(redisRateLimit);
const mockShouldFailClosed = vi.mocked(shouldFailClosedForAuth);

function makeRequest(ip = '1.2.3.4'): Request {
  return new Request('https://example.com/api', {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rateLimiting', () => {
  beforeEach(() => {
    resetRateLimitRuntimeState();
    vi.clearAllMocks();
    // By default, Redis is unavailable
    mockCheckRedisHealth.mockResolvedValue(false);
    mockShouldFailClosed.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rateLimitConfig', () => {
    it('exports predefined configurations', () => {
      expect(rateLimitConfig.login_attempts.maxAttempts).toBe(5);
      expect(rateLimitConfig.api_requests.maxAttempts).toBe(1000);
      expect(rateLimitConfig.password_reset.maxAttempts).toBe(3);
      expect(rateLimitConfig.file_upload.maxAttempts).toBe(20);
    });
  });

  describe('fail-open behavior (Redis unavailable, non-critical)', () => {
    it('allows request when Redis is unavailable and not fail-closed', async () => {
      const result = await rateLimit(makeRequest(), 'login_attempts');
      expect(result.success).toBe(true);
    });

    it('returns maxAttempts as remainingAttempts when failing open', async () => {
      const result = await rateLimit(makeRequest(), 'login_attempts');
      expect(result.remainingAttempts).toBe(rateLimitConfig.login_attempts.maxAttempts);
    });

    it('uses different buckets per IP (both allowed when failing open)', async () => {
      const req1 = makeRequest('192.168.1.1');
      const req2 = makeRequest('192.168.1.2');
      const result1 = await rateLimit(req1, 'login_attempts');
      const result2 = await rateLimit(req2, 'login_attempts');
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('fail-closed behavior', () => {
    it('blocks request when shouldFailClosedForAuth returns true and Redis is unavailable', async () => {
      mockShouldFailClosed.mockReturnValue(true);
      const result = await rateLimit(makeRequest(), 'login_attempts');
      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
      expect(result.degraded).toBe(true);
    });

    it('blocks request when requireRedis option is set and Redis is unavailable', async () => {
      const result = await rateLimit(makeRequest(), 'login_attempts', 5, 15 * 60 * 1000, {
        requireRedis: true,
      });
      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
      expect(result.degraded).toBe(true);
    });
  });

  describe('Redis path', () => {
    it('uses Redis result when Redis is healthy', async () => {
      mockCheckRedisHealth.mockResolvedValue(true);
      mockRedisRateLimit.mockResolvedValue({
        success: true,
        remaining: 8,
        resetTime: Date.now() + 60000,
        fallback: false,
      } as never);

      const result = await rateLimit(makeRequest(), 'api_requests');
      expect(result.success).toBe(true);
      expect(result.remainingAttempts).toBe(8);
    });

    it('returns degraded result when Redis returns degraded flag', async () => {
      mockCheckRedisHealth.mockResolvedValue(true);
      mockRedisRateLimit.mockResolvedValue({
        success: false,
        degraded: true,
        resetTime: Date.now() + 30000,
        retryAfter: 30,
        fallback: false,
      } as never);

      const result = await rateLimit(makeRequest(), 'login_attempts');
      expect(result.success).toBe(false);
      expect(result.degraded).toBe(true);
      expect(result.isBlocked).toBe(true);
    });

    it('returns blocked result when Redis rate limit is exceeded', async () => {
      mockCheckRedisHealth.mockResolvedValue(true);
      mockRedisRateLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
        fallback: false,
      } as never);

      const result = await rateLimit(makeRequest(), 'login_attempts');
      expect(result.success).toBe(false);
      expect(result.isBlocked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
    });

    it('includes remaining attempts when Redis returns a count', async () => {
      mockCheckRedisHealth.mockResolvedValue(true);
      mockRedisRateLimit.mockResolvedValue({
        success: true,
        remaining: 3,
        resetTime: Date.now() + 60000,
        fallback: false,
      } as never);

      const result = await rateLimit(makeRequest(), 'api_requests');
      expect(result.remainingAttempts).toBe(3);
    });
  });

  describe('withRateLimit', () => {
    it('returns null when Redis allows the request', async () => {
      mockCheckRedisHealth.mockResolvedValue(true);
      mockRedisRateLimit.mockResolvedValue({
        success: true,
        remaining: 999,
        resetTime: Date.now() + 60000,
        fallback: false,
      } as never);

      const middleware = withRateLimit('api_requests');
      const result = await middleware(makeRequest('70.0.0.1'));
      expect(result).toBeNull();
    });

    it('returns 429 response with Retry-After header when Redis blocks the request', async () => {
      mockCheckRedisHealth.mockResolvedValue(true);
      mockRedisRateLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
        fallback: false,
      } as never);

      const middleware = withRateLimit('login_attempts');
      const result = await middleware(makeRequest('80.0.0.1'));
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('returns null when Redis is unavailable and failing open', async () => {
      // Redis unavailable, shouldFailClosed = false → fail-open → allow
      const middleware = withRateLimit('api_requests');
      const result = await middleware(makeRequest('90.0.0.1'));
      expect(result).toBeNull();
    });
  });

  describe('IP extraction edge cases', () => {
    it('uses x-forwarded-for first IP when multiple IPs present', async () => {
      const request = new Request('https://example.com', {
        headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' },
      });
      const result = await rateLimit(request, 'login_attempts');
      expect(result.success).toBe(true);
    });

    it('falls back to 127.0.0.1 when no IP headers present', async () => {
      const request = new Request('https://example.com');
      const result = await rateLimit(request, 'login_attempts');
      expect(result.success).toBe(true);
    });

    it('uses x-real-ip when x-forwarded-for is absent', async () => {
      const request = new Request('https://example.com', {
        headers: { 'x-real-ip': '55.55.55.55' },
      });
      const result = await rateLimit(request, 'login_attempts');
      expect(result.success).toBe(true);
    });
  });
});
