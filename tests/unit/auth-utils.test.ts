jest.mock('@/lib/redis', () => ({
  redisUtils: {
    del: jest.fn(),
  },
}));

import {
  buildPhoneLookupValues,
  computeIsFullyVerified,
  invalidateAuthCache,
  isValidObjectId,
  normalizeEmail,
  normalizeIndianPhone,
  toPhoneOtpIdentifier,
} from '@/lib/auth-utils';
import { redisUtils } from '@/lib/redis';

// ── normalizeEmail ─────────────────────────────────────────────────────────────

describe('normalizeEmail', () => {
  it('lowercases and trims the email', () => {
    expect(normalizeEmail('  PERSON@Example.COM ')).toBe('person@example.com');
  });

  it('returns empty string for non-string input', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(42)).toBe('');
    expect(normalizeEmail({})).toBe('');
  });

  it('preserves valid lowercase email unchanged', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('handles already-trimmed uppercase email', () => {
    expect(normalizeEmail('USER@DOMAIN.ORG')).toBe('user@domain.org');
  });

  it('trims leading and trailing whitespace only (not internal)', () => {
    // emails don't have spaces internally in practice — just check trim works
    expect(normalizeEmail('  test@test.com  ')).toBe('test@test.com');
  });
});

// ── normalizeIndianPhone ───────────────────────────────────────────────────────

describe('normalizeIndianPhone', () => {
  it('accepts 10-digit numbers starting with 6-9', () => {
    expect(normalizeIndianPhone('9876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('8123456789')).toBe('+918123456789');
    expect(normalizeIndianPhone('7000000000')).toBe('+917000000000');
    expect(normalizeIndianPhone('6000000001')).toBe('+916000000001');
  });

  it('accepts +91 prefixed numbers with spaces and dashes', () => {
    expect(normalizeIndianPhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+91-98765-43210')).toBe('+919876543210');
    expect(normalizeIndianPhone('+919876543210')).toBe('+919876543210');
  });

  it('accepts 91-prefixed 12-digit number', () => {
    expect(normalizeIndianPhone('919876543210')).toBe('+919876543210');
  });

  it('accepts 091-prefixed 13-digit number', () => {
    expect(normalizeIndianPhone('0919876543210')).toBe('+919876543210');
  });

  it('rejects numbers starting with invalid digit (0-5)', () => {
    expect(normalizeIndianPhone('5876543210')).toBeNull();
    expect(normalizeIndianPhone('4000000000')).toBeNull();
    expect(normalizeIndianPhone('0000000000')).toBeNull();
  });

  it('rejects numbers that are too short', () => {
    expect(normalizeIndianPhone('98765')).toBeNull();
    expect(normalizeIndianPhone('123456789')).toBeNull(); // 9 digits
  });

  it('rejects numbers that are too long', () => {
    expect(normalizeIndianPhone('98765432101')).toBeNull(); // 11 digits
  });

  it('returns null for non-string inputs', () => {
    expect(normalizeIndianPhone(null)).toBeNull();
    expect(normalizeIndianPhone(undefined)).toBeNull();
    expect(normalizeIndianPhone(9876543210)).toBeNull();
    expect(normalizeIndianPhone({})).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeIndianPhone('')).toBeNull();
  });

  it('returns null for non-numeric garbage', () => {
    expect(normalizeIndianPhone('not-a-number')).toBeNull();
  });
});

// ── toPhoneOtpIdentifier ───────────────────────────────────────────────────────

describe('toPhoneOtpIdentifier', () => {
  it('delegates to normalizeIndianPhone for valid numbers', () => {
    expect(toPhoneOtpIdentifier('9876543210')).toBe('+919876543210');
    expect(toPhoneOtpIdentifier('+919876543210')).toBe('+919876543210');
  });

  it('returns null for invalid numbers', () => {
    expect(toPhoneOtpIdentifier('12345')).toBeNull();
    expect(toPhoneOtpIdentifier(null)).toBeNull();
  });
});

// ── buildPhoneLookupValues ─────────────────────────────────────────────────────

describe('buildPhoneLookupValues', () => {
  it('includes the normalized form with +91 prefix', () => {
    const values = buildPhoneLookupValues('+919876543210');
    expect(values).toContain('+919876543210');
  });

  it('includes the 10-digit national form', () => {
    const values = buildPhoneLookupValues('+919876543210');
    expect(values).toContain('9876543210');
  });

  it('includes the 91-prefixed form without plus', () => {
    const values = buildPhoneLookupValues('+919876543210');
    expect(values).toContain('919876543210');
  });

  it('includes the 0-prefixed national form', () => {
    const values = buildPhoneLookupValues('+919876543210');
    expect(values).toContain('09876543210');
  });

  it('returns deduplicated values (no duplicates)', () => {
    const values = buildPhoneLookupValues('+919876543210');
    expect(new Set(values).size).toBe(values.length);
  });

  it('returns an array with multiple variants', () => {
    const values = buildPhoneLookupValues('+919876543210');
    expect(values.length).toBeGreaterThanOrEqual(4);
  });
});

// ── isValidObjectId ────────────────────────────────────────────────────────────

describe('isValidObjectId', () => {
  it('accepts valid 24-char hex MongoDB ObjectId', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('000000000000000000000001')).toBe(true);
  });

  it('rejects strings that are too short', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
    expect(isValidObjectId('')).toBe(false);
  });

  it('rejects strings that are too long', () => {
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false); // 25 chars
  });

  it('rejects non-hex characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false);
    expect(isValidObjectId('not-object-id-at-all-xxx')).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidObjectId(null)).toBe(false);
    expect(isValidObjectId(undefined)).toBe(false);
  });

  it('rejects numbers and objects', () => {
    expect(isValidObjectId(507)).toBe(false);
    expect(isValidObjectId({})).toBe(false);
  });

  it('rejects all-zero ObjectId (timestamp 0 check)', () => {
    // First 8 hex chars = timestamp; parseInt(..., 16) must be > 0
    expect(isValidObjectId('000000000000000000000000')).toBe(false);
  });
});

// ── computeIsFullyVerified ─────────────────────────────────────────────────────

describe('computeIsFullyVerified', () => {
  it('returns true only when both email and phone are verified', () => {
    expect(computeIsFullyVerified(true, true)).toBe(true);
  });

  it('returns false when email is not verified', () => {
    expect(computeIsFullyVerified(false, true)).toBe(false);
  });

  it('returns false when phone is not verified', () => {
    expect(computeIsFullyVerified(true, false)).toBe(false);
  });

  it('returns false when both are unverified', () => {
    expect(computeIsFullyVerified(false, false)).toBe(false);
  });

  it('returns false for null/undefined inputs', () => {
    expect(computeIsFullyVerified(null, null)).toBe(false);
    expect(computeIsFullyVerified(undefined, undefined)).toBe(false);
    expect(computeIsFullyVerified(true, null)).toBe(false);
    expect(computeIsFullyVerified(null, true)).toBe(false);
  });
});

// ── invalidateAuthCache ────────────────────────────────────────────────────────

describe('invalidateAuthCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes all three cache keys for the given user id', async () => {
    await invalidateAuthCache('507f1f77bcf86cd799439011');

    expect(redisUtils.del).toHaveBeenCalledWith(
      'user_session:507f1f77bcf86cd799439011',
      'user_data:507f1f77bcf86cd799439011',
      'auth_status:507f1f77bcf86cd799439011'
    );
  });

  it('calls redisUtils.del exactly once per invocation', async () => {
    await invalidateAuthCache('abc123');

    expect(redisUtils.del).toHaveBeenCalledTimes(1);
  });

  it('uses the exact user id provided — no transformation', async () => {
    await invalidateAuthCache('UPPERCASE_ID');

    expect(redisUtils.del).toHaveBeenCalledWith(
      'user_session:UPPERCASE_ID',
      'user_data:UPPERCASE_ID',
      'auth_status:UPPERCASE_ID'
    );
  });
});
