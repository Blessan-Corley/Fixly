import { vi } from 'vitest';

// Mock next/headers for getAuthContextFromCookie
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  CACHE_TTL_SECONDS,
  LOGIN_RATE_LIMIT_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  AUTH_ERROR_INVALID_CREDENTIALS,
  AUTH_ERROR_ACCESS_DENIED,
  AUTH_ERROR_RATE_LIMITED,
  AUTH_ERROR_TEMPORARILY_UNAVAILABLE,
  isNonEmptyString,
  isRole,
  isAuthMethod,
  asOptionalRole,
  asOptionalAuthMethod,
  asOptionalString,
  isEmailLike,
  isTemporaryUsername,
  isPendingGoogleSessionId,
  getPendingGoogleSessionId,
  getGoogleIdFromPendingSessionId,
  computeRegistrationState,
  isDisabledAccount,
  isValidObjectId,
  getProfileEmail,
  getProfileName,
  getProfilePicture,
  getRequestIpFromCredentialsRequest,
  getAuthContextFromCookie,
} from '@/lib/auth/utils';
import { cookies } from 'next/headers';

// ── Constants ──────────────────────────────────────────────────────────────────

describe('auth module constants', () => {
  it('session max age is 7 days in seconds', () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  it('session update age is 24 hours in seconds', () => {
    expect(SESSION_UPDATE_AGE_SECONDS).toBe(24 * 60 * 60);
  });

  it('cache TTL is 600 seconds (10 minutes)', () => {
    expect(CACHE_TTL_SECONDS).toBe(600);
  });

  it('login rate limit is 5 attempts per 15-minute window', () => {
    expect(LOGIN_RATE_LIMIT_ATTEMPTS).toBe(5);
    expect(LOGIN_RATE_LIMIT_WINDOW_SECONDS).toBe(900);
  });

  it('auth error codes are non-empty strings', () => {
    expect(AUTH_ERROR_INVALID_CREDENTIALS).toBeTruthy();
    expect(AUTH_ERROR_ACCESS_DENIED).toBeTruthy();
    expect(AUTH_ERROR_RATE_LIMITED).toBeTruthy();
    expect(AUTH_ERROR_TEMPORARILY_UNAVAILABLE).toBeTruthy();
  });
});

// ── isNonEmptyString ───────────────────────────────────────────────────────────

describe('isNonEmptyString', () => {
  it('returns true for a regular string', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isNonEmptyString('')).toBe(false);
  });

  it('returns false for a whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNonEmptyString(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNonEmptyString(undefined)).toBe(false);
  });

  it('returns false for numbers', () => {
    expect(isNonEmptyString(42)).toBe(false);
  });

  it('returns false for objects', () => {
    expect(isNonEmptyString({})).toBe(false);
  });
});

// ── isRole ─────────────────────────────────────────────────────────────────────

describe('isRole', () => {
  it('accepts valid roles', () => {
    expect(isRole('hirer')).toBe(true);
    expect(isRole('fixer')).toBe(true);
    expect(isRole('admin')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isRole('user')).toBe(false);
    expect(isRole('superadmin')).toBe(false);
    expect(isRole('HIRER')).toBe(false);
    expect(isRole('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole(1)).toBe(false);
    expect(isRole({})).toBe(false);
  });
});

// ── isAuthMethod ───────────────────────────────────────────────────────────────

describe('isAuthMethod', () => {
  it('accepts valid auth methods', () => {
    expect(isAuthMethod('email')).toBe(true);
    expect(isAuthMethod('google')).toBe(true);
    expect(isAuthMethod('phone')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isAuthMethod('facebook')).toBe(false);
    expect(isAuthMethod('EMAIL')).toBe(false);
    expect(isAuthMethod('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isAuthMethod(null)).toBe(false);
    expect(isAuthMethod(undefined)).toBe(false);
  });
});

// ── asOptionalRole ──────────────────────────────────────────────────────────────

describe('asOptionalRole', () => {
  it('returns the role for valid values', () => {
    expect(asOptionalRole('hirer')).toBe('hirer');
    expect(asOptionalRole('fixer')).toBe('fixer');
    expect(asOptionalRole('admin')).toBe('admin');
  });

  it('returns undefined for invalid values', () => {
    expect(asOptionalRole('invalid')).toBeUndefined();
    expect(asOptionalRole(null)).toBeUndefined();
    expect(asOptionalRole(undefined)).toBeUndefined();
    expect(asOptionalRole('')).toBeUndefined();
  });
});

// ── asOptionalAuthMethod ────────────────────────────────────────────────────────

describe('asOptionalAuthMethod', () => {
  it('returns valid auth methods', () => {
    expect(asOptionalAuthMethod('email')).toBe('email');
    expect(asOptionalAuthMethod('google')).toBe('google');
    expect(asOptionalAuthMethod('phone')).toBe('phone');
  });

  it('returns undefined for invalid values', () => {
    expect(asOptionalAuthMethod('facebook')).toBeUndefined();
    expect(asOptionalAuthMethod(null)).toBeUndefined();
  });
});

// ── asOptionalString ────────────────────────────────────────────────────────────

describe('asOptionalString', () => {
  it('returns non-empty strings unchanged', () => {
    expect(asOptionalString('hello')).toBe('hello');
    expect(asOptionalString('  x  ')).toBe('  x  ');
  });

  it('returns undefined for empty/whitespace/null/undefined', () => {
    expect(asOptionalString('')).toBeUndefined();
    expect(asOptionalString('   ')).toBeUndefined();
    expect(asOptionalString(null)).toBeUndefined();
    expect(asOptionalString(undefined)).toBeUndefined();
    expect(asOptionalString(42)).toBeUndefined();
  });
});

// ── isEmailLike ─────────────────────────────────────────────────────────────────

describe('isEmailLike', () => {
  it('returns true when the string contains @', () => {
    expect(isEmailLike('user@example.com')).toBe(true);
    expect(isEmailLike('@')).toBe(true);
  });

  it('returns false when the string does not contain @', () => {
    expect(isEmailLike('username')).toBe(false);
    expect(isEmailLike('')).toBe(false);
  });
});

// ── isTemporaryUsername ─────────────────────────────────────────────────────────

describe('isTemporaryUsername', () => {
  it('detects tmp_ prefix', () => {
    expect(isTemporaryUsername('tmp_abc123')).toBe(true);
  });

  it('detects temp_ prefix', () => {
    expect(isTemporaryUsername('temp_abc123')).toBe(true);
  });

  it('returns false for regular usernames', () => {
    expect(isTemporaryUsername('john_doe')).toBe(false);
    expect(isTemporaryUsername('admin')).toBe(false);
  });

  it('returns false for empty or non-string values', () => {
    expect(isTemporaryUsername('')).toBe(false);
    expect(isTemporaryUsername(null)).toBe(false);
    expect(isTemporaryUsername(undefined)).toBe(false);
    expect(isTemporaryUsername(42)).toBe(false);
  });
});

// ── isPendingGoogleSessionId ────────────────────────────────────────────────────

describe('isPendingGoogleSessionId', () => {
  it('returns true for pending_google: prefixed strings', () => {
    expect(isPendingGoogleSessionId('pending_google:abc123')).toBe(true);
  });

  it('returns false for regular IDs', () => {
    expect(isPendingGoogleSessionId('507f1f77bcf86cd799439011')).toBe(false);
    expect(isPendingGoogleSessionId('')).toBe(false);
    expect(isPendingGoogleSessionId(null)).toBe(false);
  });
});

// ── getPendingGoogleSessionId / getGoogleIdFromPendingSessionId ─────────────────

describe('getPendingGoogleSessionId and getGoogleIdFromPendingSessionId', () => {
  it('wraps a google ID in the pending prefix', () => {
    expect(getPendingGoogleSessionId('google-id-123')).toBe('pending_google:google-id-123');
  });

  it('extracts google ID from a pending session ID', () => {
    expect(getGoogleIdFromPendingSessionId('pending_google:google-id-123')).toBe('google-id-123');
  });

  it('returns undefined for non-pending session IDs', () => {
    expect(getGoogleIdFromPendingSessionId('507f1f77bcf86cd799439011')).toBeUndefined();
    expect(getGoogleIdFromPendingSessionId('')).toBeUndefined();
    expect(getGoogleIdFromPendingSessionId(null)).toBeUndefined();
  });

  it('is a round-trip: wrap then unwrap returns original ID', () => {
    const googleId = 'abc-123-xyz';
    const pending = getPendingGoogleSessionId(googleId);
    expect(getGoogleIdFromPendingSessionId(pending)).toBe(googleId);
  });
});

// ── computeRegistrationState ────────────────────────────────────────────────────

describe('computeRegistrationState', () => {
  it('returns true when role, username, and isRegistered are all valid', () => {
    expect(computeRegistrationState('hirer', 'john_doe', true)).toBe(true);
    expect(computeRegistrationState('fixer', 'jane_smith', true)).toBe(true);
    expect(computeRegistrationState('admin', 'super_admin', true)).toBe(true);
  });

  it('returns false when isRegistered is false', () => {
    expect(computeRegistrationState('hirer', 'john_doe', false)).toBe(false);
  });

  it('returns false when role is invalid', () => {
    expect(computeRegistrationState('invalid', 'john_doe', true)).toBe(false);
    expect(computeRegistrationState(null, 'john_doe', true)).toBe(false);
    expect(computeRegistrationState(undefined, 'john_doe', true)).toBe(false);
  });

  it('returns false when username is empty', () => {
    expect(computeRegistrationState('hirer', '', true)).toBe(false);
    expect(computeRegistrationState('hirer', null, true)).toBe(false);
    expect(computeRegistrationState('hirer', undefined, true)).toBe(false);
  });

  it('returns false for temporary usernames', () => {
    expect(computeRegistrationState('hirer', 'tmp_12345', true)).toBe(false);
    expect(computeRegistrationState('hirer', 'temp_abc', true)).toBe(false);
  });

  it('returns false when isRegistered is not strictly true', () => {
    expect(computeRegistrationState('hirer', 'john_doe', null)).toBe(false);
    expect(computeRegistrationState('hirer', 'john_doe', 1)).toBe(false);
    expect(computeRegistrationState('hirer', 'john_doe', 'true')).toBe(false);
  });
});

// ── isDisabledAccount ───────────────────────────────────────────────────────────

describe('isDisabledAccount', () => {
  it('returns true when banned is true', () => {
    expect(isDisabledAccount(true, true, false)).toBe(true);
  });

  it('returns true when isActive is false', () => {
    expect(isDisabledAccount(false, false, false)).toBe(true);
  });

  it('returns true when deleted is true', () => {
    expect(isDisabledAccount(false, true, true)).toBe(true);
  });

  it('returns true when deleted is a Date (soft delete)', () => {
    expect(isDisabledAccount(false, true, new Date())).toBe(true);
  });

  it('returns false for a normal active account', () => {
    expect(isDisabledAccount(false, true, false)).toBe(false);
  });

  it('returns false when banned is undefined/null', () => {
    expect(isDisabledAccount(undefined, true, false)).toBe(false);
    expect(isDisabledAccount(null, true, false)).toBe(false);
  });
});

// ── isValidObjectId ─────────────────────────────────────────────────────────────

describe('isValidObjectId (auth/utils)', () => {
  it('accepts valid 24-character hex object IDs', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('5f43a0e0b0e6a918f0c9d8e1')).toBe(true);
  });

  it('rejects IDs shorter than 24 characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false);
  });

  it('rejects IDs longer than 24 characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false);
  });

  it('rejects IDs with non-hex characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false);
    expect(isValidObjectId('not-a-valid-objectid-xxx')).toBe(false);
  });

  it('rejects all-zero IDs (zero timestamp)', () => {
    expect(isValidObjectId('000000000000000000000000')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isValidObjectId('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidObjectId(null)).toBe(false);
    expect(isValidObjectId(undefined)).toBe(false);
    expect(isValidObjectId(123456789012345678901234)).toBe(false);
  });
});

// ── getProfileEmail / getProfileName / getProfilePicture ────────────────────────

describe('profile field extraction', () => {
  describe('getProfileEmail', () => {
    it('prefers profile email over user email', () => {
      expect(
        getProfileEmail({ email: 'Profile@Example.COM' } as never, { email: 'user@example.com' })
      ).toBe('profile@example.com');
    });

    it('falls back to user email if profile email missing', () => {
      expect(getProfileEmail(null, { email: 'user@example.com' })).toBe('user@example.com');
    });

    it('lowercases the returned email', () => {
      expect(getProfileEmail({ email: 'UPPER@EXAMPLE.COM' } as never, null)).toBe(
        'upper@example.com'
      );
    });

    it('returns undefined when both are absent', () => {
      expect(getProfileEmail(null, null)).toBeUndefined();
      expect(getProfileEmail(null, {})).toBeUndefined();
    });
  });

  describe('getProfileName', () => {
    it('prefers profile name over user name', () => {
      expect(getProfileName({ name: 'Profile Name' } as never, { name: 'User Name' })).toBe(
        'Profile Name'
      );
    });

    it('falls back to user name', () => {
      expect(getProfileName(null, { name: 'User Name' })).toBe('User Name');
    });

    it('returns undefined when both absent', () => {
      expect(getProfileName(null, null)).toBeUndefined();
    });
  });

  describe('getProfilePicture', () => {
    it('prefers profile picture over user image', () => {
      expect(
        getProfilePicture(
          { picture: 'https://example.com/profile.jpg' } as never,
          { image: 'https://example.com/user.jpg' }
        )
      ).toBe('https://example.com/profile.jpg');
    });

    it('falls back to user image, then user picture', () => {
      expect(getProfilePicture(null, { image: 'https://example.com/user.jpg' })).toBe(
        'https://example.com/user.jpg'
      );
      expect(
        getProfilePicture(null, { picture: 'https://example.com/user-pic.jpg' })
      ).toBe('https://example.com/user-pic.jpg');
    });

    it('returns undefined when all sources absent', () => {
      expect(getProfilePicture(null, null)).toBeUndefined();
    });
  });
});

// ── getRequestIpFromCredentialsRequest ──────────────────────────────────────────

describe('getRequestIpFromCredentialsRequest', () => {
  it('returns unknown for null/undefined/non-object input', () => {
    expect(getRequestIpFromCredentialsRequest(null)).toBe('unknown');
    expect(getRequestIpFromCredentialsRequest(undefined)).toBe('unknown');
    expect(getRequestIpFromCredentialsRequest('string')).toBe('unknown');
  });

  it('returns unknown when headers property is missing', () => {
    expect(getRequestIpFromCredentialsRequest({})).toBe('unknown');
  });

  it('extracts first IP from x-forwarded-for using Headers API', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' });
    expect(getRequestIpFromCredentialsRequest({ headers })).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '5.6.7.8' });
    expect(getRequestIpFromCredentialsRequest({ headers })).toBe('5.6.7.8');
  });

  it('falls back to cf-connecting-ip as last resort', () => {
    const headers = new Headers({ 'cf-connecting-ip': '9.10.11.12' });
    expect(getRequestIpFromCredentialsRequest({ headers })).toBe('9.10.11.12');
  });

  it('returns unknown when no IP headers present', () => {
    const headers = new Headers({});
    expect(getRequestIpFromCredentialsRequest({ headers })).toBe('unknown');
  });

  it('works with plain record-style headers (no .get method)', () => {
    const headers = { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' };
    expect(getRequestIpFromCredentialsRequest({ headers })).toBe('10.0.0.1');
  });

  it('works with array-style forwarded-for in plain headers', () => {
    const headers = { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] };
    expect(getRequestIpFromCredentialsRequest({ headers })).toBe('10.0.0.1');
  });

  it('strips leading whitespace from extracted IP', () => {
    const headers = new Headers({ 'x-forwarded-for': '  1.2.3.4, 5.6.7.8' });
    expect(getRequestIpFromCredentialsRequest({ headers })).toBe('1.2.3.4');
  });
});

// ── getAuthContextFromCookie ────────────────────────────────────────────────────

describe('getAuthContextFromCookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns "signin" when the secure cookie contains "signin"', async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) => {
        if (name === '__Secure-fixly-auth-context') return { value: 'signin' };
        return undefined;
      },
    });

    expect(await getAuthContextFromCookie()).toBe('signin');
  });

  it('returns "signup" when the dev cookie contains "signup"', async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) => {
        if (name === 'fixly-auth-context') return { value: 'signup' };
        return undefined;
      },
    });

    expect(await getAuthContextFromCookie()).toBe('signup');
  });

  it('returns null when cookie value is invalid', async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => ({ value: 'invalid-context' }),
    });

    expect(await getAuthContextFromCookie()).toBeNull();
  });

  it('returns null when no auth-context cookie is set', async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => undefined,
    });

    expect(await getAuthContextFromCookie()).toBeNull();
  });

  it('returns null and does not throw when cookies() throws', async () => {
    (cookies as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('cookies() called outside request scope')
    );

    expect(await getAuthContextFromCookie()).toBeNull();
  });
});
