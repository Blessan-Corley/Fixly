import crypto from 'crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Must mock env before importing module under test
vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret-value',
    AUTH_SECRET: undefined,
    NODE_ENV: 'test',
  },
}));

import {
  compareOtpHash,
  createOtpHash,
  createOtpRecord,
  generateOTP,
  getOtpSecret,
} from '@/lib/otp/hashing';

// ── getOtpSecret ───────────────────────────────────────────────────────────────

describe('getOtpSecret', () => {
  it('returns NEXTAUTH_SECRET when set', async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).NEXTAUTH_SECRET = 'my-secret';
    (env as Record<string, unknown>).AUTH_SECRET = undefined;

    expect(getOtpSecret()).toBe('my-secret');
  });

  it('falls back to AUTH_SECRET when NEXTAUTH_SECRET is falsy', async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).NEXTAUTH_SECRET = undefined;
    (env as Record<string, unknown>).AUTH_SECRET = 'auth-fallback-secret';

    expect(getOtpSecret()).toBe('auth-fallback-secret');
  });

  it('throws when neither secret is set', async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).NEXTAUTH_SECRET = undefined;
    (env as Record<string, unknown>).AUTH_SECRET = undefined;

    expect(() => getOtpSecret()).toThrow(
      'OTP secret is not configured. Set NEXTAUTH_SECRET or AUTH_SECRET.'
    );
  });

  afterEach(async () => {
    // Restore default
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).NEXTAUTH_SECRET = 'test-secret-value';
    (env as Record<string, unknown>).AUTH_SECRET = undefined;
  });
});

// ── generateOTP ────────────────────────────────────────────────────────────────

describe('generateOTP', () => {
  it('returns a 6-digit string', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('is always in the range 100000–999999', () => {
    for (let i = 0; i < 50; i++) {
      const otp = parseInt(generateOTP(), 10);
      expect(otp).toBeGreaterThanOrEqual(100000);
      expect(otp).toBeLessThanOrEqual(999999);
    }
  });

  it('produces different values across calls (entropy check)', () => {
    const results = new Set(Array.from({ length: 20 }, generateOTP));
    expect(results.size).toBeGreaterThan(1);
  });
});

// ── createOtpHash ──────────────────────────────────────────────────────────────

describe('createOtpHash', () => {
  beforeEach(async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).NEXTAUTH_SECRET = 'stable-secret';
    (env as Record<string, unknown>).AUTH_SECRET = undefined;
  });

  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = createOtpHash('user@example.com', 'signup', '123456', 'saltabc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same inputs', () => {
    const h1 = createOtpHash('a@b.com', 'signup', '111111', 'salt1');
    const h2 = createOtpHash('a@b.com', 'signup', '111111', 'salt1');
    expect(h1).toBe(h2);
  });

  it('differs for different identifiers', () => {
    const h1 = createOtpHash('a@b.com', 'signup', '111111', 'salt1');
    const h2 = createOtpHash('c@d.com', 'signup', '111111', 'salt1');
    expect(h1).not.toBe(h2);
  });

  it('differs for different purposes', () => {
    const h1 = createOtpHash('a@b.com', 'signup', '111111', 'salt1');
    const h2 = createOtpHash('a@b.com', 'password_reset', '111111', 'salt1');
    expect(h1).not.toBe(h2);
  });

  it('differs for different OTP values', () => {
    const h1 = createOtpHash('a@b.com', 'signup', '111111', 'salt1');
    const h2 = createOtpHash('a@b.com', 'signup', '222222', 'salt1');
    expect(h1).not.toBe(h2);
  });

  it('differs for different salts', () => {
    const h1 = createOtpHash('a@b.com', 'signup', '111111', 'salt1');
    const h2 = createOtpHash('a@b.com', 'signup', '111111', 'salt2');
    expect(h1).not.toBe(h2);
  });
});

// ── compareOtpHash ─────────────────────────────────────────────────────────────

describe('compareOtpHash', () => {
  beforeEach(async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).NEXTAUTH_SECRET = 'stable-secret';
    (env as Record<string, unknown>).AUTH_SECRET = undefined;
  });

  it('returns true when hashes are identical', () => {
    const hash = createOtpHash('user@x.com', 'signup', '654321', 'somesalt');
    expect(compareOtpHash(hash, hash)).toBe(true);
  });

  it('returns false when hashes differ', () => {
    const h1 = createOtpHash('user@x.com', 'signup', '654321', 'somesalt');
    const h2 = createOtpHash('user@x.com', 'signup', '000000', 'somesalt');
    expect(compareOtpHash(h1, h2)).toBe(false);
  });

  it('returns false when hashes are different lengths', () => {
    const h1 = 'abcd1234';
    const h2 = 'abcd12340000'; // longer
    expect(compareOtpHash(h1, h2)).toBe(false);
  });

  it('is timing-safe (uses crypto.timingSafeEqual internally)', () => {
    // Spy to verify timingSafeEqual is called when lengths match
    const spy = vi.spyOn(crypto, 'timingSafeEqual');
    const hash = createOtpHash('e@f.com', 'signup', '123456', 'salt');
    compareOtpHash(hash, hash);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ── createOtpRecord ────────────────────────────────────────────────────────────

describe('createOtpRecord', () => {
  beforeEach(async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).NEXTAUTH_SECRET = 'stable-secret';
    (env as Record<string, unknown>).AUTH_SECRET = undefined;
  });

  it('returns an OtpData object with the expected shape', () => {
    const before = Date.now();
    const record = createOtpRecord('u@v.com', 'signup', '123456', 300);
    const after = Date.now();

    expect(record.attempts).toBe(0);
    expect(record.maxAttempts).toBe(5);
    expect(record.lastAttemptAt).toBeNull();
    expect(record.salt).toBeTruthy();
    expect(record.otpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(record.createdAt).toBeGreaterThanOrEqual(before);
    expect(record.createdAt).toBeLessThanOrEqual(after);
    expect(record.expiresAt).toBeGreaterThanOrEqual(record.createdAt + 300 * 1000);
    expect(record.expiresAt).toBeLessThanOrEqual(after + 300 * 1000);
  });

  it('generates a unique 32-char hex salt', () => {
    const r = createOtpRecord('u@v.com', 'signup', '123456', 300);
    expect(r.salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('computes a hash verifiable by compareOtpHash', () => {
    const record = createOtpRecord('u@v.com', 'signup', '123456', 300);
    const expectedHash = createOtpHash('u@v.com', 'signup', '123456', record.salt);
    expect(compareOtpHash(record.otpHash, expectedHash)).toBe(true);
  });

  it('produces different salts on separate calls', () => {
    const r1 = createOtpRecord('u@v.com', 'signup', '123456', 300);
    const r2 = createOtpRecord('u@v.com', 'signup', '123456', 300);
    expect(r1.salt).not.toBe(r2.salt);
  });

  it('sets expiresAt correctly based on ttlSeconds', () => {
    const before = Date.now();
    const record = createOtpRecord('u@v.com', 'signup', '111111', 60);
    expect(record.expiresAt - record.createdAt).toBeCloseTo(60 * 1000, -2);
  });

  it('wrong OTP does NOT verify against the stored hash', () => {
    const record = createOtpRecord('u@v.com', 'signup', '123456', 300);
    const wrongHash = createOtpHash('u@v.com', 'signup', '000000', record.salt);
    expect(compareOtpHash(record.otpHash, wrongHash)).toBe(false);
  });
});
