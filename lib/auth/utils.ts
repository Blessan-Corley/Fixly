// Pure helper utilities shared by providers and callbacks
import type { Profile } from 'next-auth';

import type { AuthCallbackUserLike, AuthContext, ExtendedProfile, Role } from './types';

// ── Constants ──────────────────────────────────────────────────────────────────
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;
export const CACHE_TTL_SECONDS = 600;
export const LOGIN_RATE_LIMIT_ATTEMPTS = 5;
export const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 900;
export const AUTH_ERROR_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS';
export const AUTH_ERROR_ACCESS_DENIED = 'AUTH_ACCESS_DENIED';
export const AUTH_ERROR_RATE_LIMITED = 'AUTH_RATE_LIMITED';
export const AUTH_ERROR_TEMPORARILY_UNAVAILABLE = 'AUTH_TEMPORARILY_UNAVAILABLE';

// ── Type guards ────────────────────────────────────────────────────────────────
export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const isRole = (value: unknown): value is Role =>
  value === 'hirer' || value === 'fixer' || value === 'admin';

export const isAuthMethod = (value: unknown): value is 'email' | 'google' | 'phone' =>
  value === 'email' || value === 'google' || value === 'phone';

export const asOptionalRole = (value: unknown): Role | undefined =>
  isRole(value) ? value : undefined;

export const asOptionalAuthMethod = (value: unknown): 'email' | 'google' | 'phone' | undefined =>
  isAuthMethod(value) ? value : undefined;

export const asOptionalString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value : undefined;

export const isEmailLike = (value: string): boolean => value.includes('@');

export const isTemporaryUsername = (value: unknown): boolean =>
  isNonEmptyString(value) && (value.startsWith('tmp_') || value.startsWith('temp_'));

export const isPendingGoogleSessionId = (value: unknown): value is string =>
  isNonEmptyString(value) && value.startsWith('pending_google:');

export const getPendingGoogleSessionId = (googleId: string): string => `pending_google:${googleId}`;

export const getGoogleIdFromPendingSessionId = (value: unknown): string | undefined =>
  isPendingGoogleSessionId(value) ? value.slice('pending_google:'.length) : undefined;

// ── Business logic helpers ────────────────────────────────────────────────────
export const computeRegistrationState = (
  role: unknown,
  username: unknown,
  isRegistered: unknown
): boolean => {
  return Boolean(
    isRegistered === true &&
    isRole(role) &&
    isNonEmptyString(username) &&
    !isTemporaryUsername(username)
  );
};

export const isDisabledAccount = (banned: unknown, isActive: unknown, deleted: unknown): boolean =>
  banned === true || isActive === false || deleted === true || deleted instanceof Date;

export const isValidObjectId = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) return false;
  if (value.length !== 24) return false;
  if (!/^[0-9a-fA-F]{24}$/i.test(value)) return false;

  const timestampHex = value.substring(0, 8);
  return Number.parseInt(timestampHex, 16) > 0;
};

// ── Profile field extraction ──────────────────────────────────────────────────
export const getProfileEmail = (
  profile?: Profile | null,
  user?: AuthCallbackUserLike | null
): string | undefined => {
  const profileEmail = asOptionalString(
    (profile as ExtendedProfile | undefined)?.email
  )?.toLowerCase();
  const userEmail = asOptionalString(user?.email)?.toLowerCase();
  return profileEmail ?? userEmail;
};

export const getProfileName = (
  profile?: Profile | null,
  user?: AuthCallbackUserLike | null
): string | undefined => {
  return (
    asOptionalString((profile as ExtendedProfile | undefined)?.name) ?? asOptionalString(user?.name)
  );
};

export const getProfilePicture = (
  profile?: Profile | null,
  user?: AuthCallbackUserLike | null
): string | undefined => {
  return (
    asOptionalString((profile as ExtendedProfile | undefined)?.picture) ??
    asOptionalString(user?.image) ??
    asOptionalString(user?.picture)
  );
};

// ── Request / cookie helpers ──────────────────────────────────────────────────
export const getRequestIpFromCredentialsRequest = (request: unknown): string => {
  if (!request || typeof request !== 'object') {
    return 'unknown';
  }

  const candidate = request as {
    headers?: Headers | Record<string, string | string[] | undefined>;
  };

  const headers = candidate.headers;
  if (!headers) {
    return 'unknown';
  }

  if (typeof (headers as Headers).get === 'function') {
    const forwarded = (headers as Headers).get('x-forwarded-for');
    const realIp = (headers as Headers).get('x-real-ip');
    const cfIp = (headers as Headers).get('cf-connecting-ip');
    const fromHeader = forwarded || realIp || cfIp || '';
    return fromHeader.split(',')[0]?.trim() || 'unknown';
  }

  const rawHeaders = headers as Record<string, string | string[] | undefined>;
  const forwarded = rawHeaders['x-forwarded-for'];
  const realIp = rawHeaders['x-real-ip'];
  const cfIp = rawHeaders['cf-connecting-ip'];
  const fromHeader = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded ||
      (Array.isArray(realIp) ? realIp[0] : realIp) ||
      (Array.isArray(cfIp) ? cfIp[0] : cfIp) ||
      '';
  return fromHeader.split(',')[0]?.trim() || 'unknown';
};

export const getAuthContextFromCookie = async (): Promise<AuthContext | null> => {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    // Cookie name is environment-dependent; we read both variants so this
    // utility does not need access to env at import time.
    const secureName = '__Secure-fixly-auth-context';
    const devName = 'fixly-auth-context';
    const value = cookieStore.get(secureName)?.value ?? cookieStore.get(devName)?.value;

    if (value === 'signin' || value === 'signup') {
      return value;
    }
  } catch {
    return null;
  }

  return null;
};
