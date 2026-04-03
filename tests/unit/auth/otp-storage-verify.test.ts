import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks (declared before imports) ───────────────────────────────────────────

const mockRedisGet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('@/lib/redis', () => ({
  redisUtils: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

const mockFallbackGet = vi.fn();
const mockFallbackDelete = vi.fn();
const mockFallbackMarkVerified = vi.fn();
const mockFallbackUpdate = vi.fn();

vi.mock('@/lib/otpFallback', () => ({
  fallbackOtpStorage: {
    get: (...args: unknown[]) => mockFallbackGet(...args),
    delete: (...args: unknown[]) => mockFallbackDelete(...args),
    markVerified: (...args: unknown[]) => mockFallbackMarkVerified(...args),
    update: (...args: unknown[]) => mockFallbackUpdate(...args),
  },
}));

let inMemoryFallbackEnabled = true;

vi.mock('@/lib/otp/storage-constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/otp/storage-constants')>();
  return {
    ...actual,
    canUseInMemoryFallback: () => inMemoryFallbackEnabled,
  };
});

vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret-for-otp',
    AUTH_SECRET: undefined,
    NODE_ENV: 'test',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createOtpHash, createOtpRecord } from '@/lib/otp/hashing';
import { verifyOtp } from '@/lib/otp/storage-verify';
import type { MutableRedisState } from '@/lib/otp/storage-verify';
import type { OtpData } from '@/lib/otp/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<OtpData> = {}): OtpData {
  const base = createOtpRecord('user@test.com', 'signup', '123456', 300);
  return { ...base, ...overrides };
}

function redisState(useRedis = true): MutableRedisState {
  return { useRedis };
}

const IDENTIFIER = 'user@test.com';
const PURPOSE = 'signup';
const VALID_OTP = '123456';

// ── Redis path — happy path ────────────────────────────────────────────────────

describe('verifyOtp — Redis path — success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('returns success=true and deletes the challenge key on correct OTP', async () => {
    const record = makeRecord();
    mockRedisGet.mockResolvedValue(record);
    mockRedisDel.mockResolvedValue(1);
    mockRedisSet.mockResolvedValue('OK');

    const state = redisState();
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/verified/i);
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledTimes(1); // verification receipt
  });

  it('returns success=false when OTP is wrong and increments attempts', async () => {
    const record = makeRecord({ attempts: 0 });
    mockRedisGet.mockResolvedValue(record);
    mockRedisDel.mockResolvedValue(1);
    mockRedisSet.mockResolvedValue('OK');

    const state = redisState();
    const result = await verifyOtp(IDENTIFIER, '000000', PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid otp/i);
    // Should save updated record with incremented attempts
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    const savedRecord: OtpData = mockRedisSet.mock.calls[0][1];
    expect(savedRecord.attempts).toBe(1);
  });
});

// ── Redis path — OTP not found ─────────────────────────────────────────────────

describe('verifyOtp — Redis path — not found', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('returns success=false with not-found message', async () => {
    mockRedisGet.mockResolvedValue(null);
    const state = redisState();
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found|expired/i);
  });

  it('performs dummy hash comparison to equalise response time', async () => {
    // Just verifies it doesn't throw and returns quickly
    mockRedisGet.mockResolvedValue(null);
    const state = redisState();
    await expect(verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state)).resolves.toBeDefined();
  });
});

// ── Redis path — expired OTP ───────────────────────────────────────────────────

describe('verifyOtp — Redis path — expired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('returns expired message and deletes the key', async () => {
    const record = makeRecord({ expiresAt: Date.now() - 1000 });
    mockRedisGet.mockResolvedValue(record);
    mockRedisDel.mockResolvedValue(1);

    const state = redisState();
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/expired/i);
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
  });
});

// ── Redis path — max attempts exceeded (pre-check) ────────────────────────────

describe('verifyOtp — Redis path — max attempts pre-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('returns lockout message when attempts >= maxAttempts on read', async () => {
    const record = makeRecord({ attempts: 5, maxAttempts: 5 });
    mockRedisGet.mockResolvedValue(record);
    mockRedisDel.mockResolvedValue(1);

    const state = redisState();
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/too many/i);
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
  });
});

// ── Redis path — reaches max attempts on wrong OTP ────────────────────────────

describe('verifyOtp — Redis path — hits max attempts on wrong OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('deletes key and returns lockout when the failing attempt is the last allowed', async () => {
    // attempts=4, maxAttempts=5 → after increment it's 5 → lockout
    const record = makeRecord({ attempts: 4, maxAttempts: 5 });
    mockRedisGet.mockResolvedValue(record);
    mockRedisDel.mockResolvedValue(1);

    const state = redisState();
    const result = await verifyOtp(IDENTIFIER, '000000', PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/too many/i);
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).not.toHaveBeenCalled(); // deleted, not updated
  });
});

// ── Redis failure → fallback ───────────────────────────────────────────────────

describe('verifyOtp — Redis failure → in-memory fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('falls back to in-memory storage when Redis throws', async () => {
    mockRedisGet.mockRejectedValue(new Error('Redis connection refused'));

    const record = makeRecord();
    mockFallbackGet.mockResolvedValue(record);
    mockFallbackDelete.mockResolvedValue(undefined);
    mockFallbackMarkVerified.mockResolvedValue(undefined);

    const state = redisState(true);
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(true);
    expect(state.useRedis).toBe(false); // degraded
  });

  it('throws AppError when Redis fails and fallback is disabled', async () => {
    inMemoryFallbackEnabled = false;
    mockRedisGet.mockRejectedValue(new Error('Redis down'));

    const state = redisState(true);
    await expect(verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state)).rejects.toThrow();
  });
});

// ── Fallback path — success ────────────────────────────────────────────────────

describe('verifyOtp — fallback path — success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('verifies OTP from fallback storage on correct OTP', async () => {
    const record = makeRecord();
    mockFallbackGet.mockResolvedValue(record);
    mockFallbackDelete.mockResolvedValue(undefined);
    mockFallbackMarkVerified.mockResolvedValue(undefined);

    const state = redisState(false);
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(true);
    expect(mockFallbackDelete).toHaveBeenCalledTimes(1);
    expect(mockFallbackMarkVerified).toHaveBeenCalledTimes(1);
  });

  it('returns not-found when OTP missing in fallback', async () => {
    mockFallbackGet.mockResolvedValue(null);

    const state = redisState(false);
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found|expired/i);
  });

  it('returns expired when OTP expired in fallback', async () => {
    const record = makeRecord({ expiresAt: Date.now() - 1 });
    mockFallbackGet.mockResolvedValue(record);
    mockFallbackDelete.mockResolvedValue(undefined);

    const state = redisState(false);
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/expired/i);
  });

  it('returns lockout from fallback when max attempts exceeded', async () => {
    const record = makeRecord({ attempts: 5, maxAttempts: 5 });
    mockFallbackGet.mockResolvedValue(record);
    mockFallbackDelete.mockResolvedValue(undefined);

    const state = redisState(false);
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/too many/i);
  });

  it('increments attempts in fallback on wrong OTP', async () => {
    const record = makeRecord({ attempts: 1, maxAttempts: 5 });
    mockFallbackGet.mockResolvedValue(record);
    mockFallbackUpdate.mockResolvedValue(undefined);

    const state = redisState(false);
    const result = await verifyOtp(IDENTIFIER, '000000', PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/invalid otp/i);
    const updated = mockFallbackUpdate.mock.calls[0][2];
    expect(updated.attempts).toBe(2);
  });
});

// ── Fallback path — service unavailable ───────────────────────────────────────

describe('verifyOtp — fallback unavailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unavailable message when both Redis and fallback are disabled', async () => {
    inMemoryFallbackEnabled = false;

    const state = redisState(false);
    const result = await verifyOtp(IDENTIFIER, VALID_OTP, PURPOSE, state);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unavailable/i);
  });
});

// ── Hash correctness integration ───────────────────────────────────────────────

describe('verifyOtp — hash correctness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('verifies only when the OTP matches the stored hash exactly', async () => {
    const correctOtp = '987654';
    const record = createOtpRecord('x@y.com', 'signup', correctOtp, 300);
    mockRedisGet.mockResolvedValue(record);
    mockRedisDel.mockResolvedValue(1);
    mockRedisSet.mockResolvedValue('OK');

    const state = redisState();

    const fail = await verifyOtp('x@y.com', '000000', 'signup', state);
    expect(fail.success).toBe(false);

    // Reset mock for second attempt
    mockRedisGet.mockResolvedValue({ ...record, attempts: 1 });
    const pass = await verifyOtp('x@y.com', correctOtp, 'signup', state);
    expect(pass.success).toBe(true);
  });
});
