import { env } from '@/lib/env';

export type AuthStatusLookup = {
  id?: string;
  email?: string;
  googleId?: string;
};

export type AuthStatusResponse = {
  found: boolean;
  id?: string;
  role?: 'hirer' | 'fixer' | 'admin';
  username?: string;
  isRegistered: boolean;
  needsOnboarding: boolean;
  authMethod?: 'email' | 'google' | 'phone';
  banned: boolean;
  isActive: boolean;
  deleted: boolean;
  sessionVersion?: number;
};

export type CachedAuthStatus = AuthStatusResponse & {
  lastUpdated: number;
};

export type LeanAuthUser = {
  _id: { toString(): string };
  role?: 'hirer' | 'fixer' | 'admin';
  username?: string;
  isRegistered?: boolean;
  authMethod?: 'email' | 'google' | 'phone';
  banned?: boolean;
  isActive?: boolean;
  deletedAt?: Date | null;
  updatedAt?: Date;
};

export const CACHE_TTL_SECONDS = 30;
export const INTERNAL_AUTH_STATUS_HEADER = 'x-internal-auth-key';
export const TEMPORARY_USERNAME_PREFIXES = ['tmp_', 'temp_'] as const;

export function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isRole(value: unknown): value is 'hirer' | 'fixer' | 'admin' {
  return value === 'hirer' || value === 'fixer' || value === 'admin';
}

export function isAuthMethod(value: unknown): value is 'email' | 'google' | 'phone' {
  return value === 'email' || value === 'google' || value === 'phone';
}

export function isTemporaryUsername(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    TEMPORARY_USERNAME_PREFIXES.some((prefix) => value.startsWith(prefix))
  );
}

export function computeRegistrationState(role: unknown, username: unknown, isRegistered: unknown): boolean {
  return Boolean(
    isRegistered === true &&
    isRole(role) &&
    typeof username === 'string' &&
    username.trim().length > 0 &&
    !isTemporaryUsername(username)
  );
}

export function isInternalRequest(request: Request): boolean {
  const configuredSecret = env.AUTH_STATUS_SECRET ?? env.NEXTAUTH_SECRET;
  if (!configuredSecret) return env.NODE_ENV !== 'production';
  return request.headers.get(INTERNAL_AUTH_STATUS_HEADER) === configuredSecret;
}

export function buildLookup(searchParams: URLSearchParams): AuthStatusLookup | null {
  const id = toTrimmedString(searchParams.get('id')) ?? undefined;
  const email = toTrimmedString(searchParams.get('email'))?.toLowerCase() ?? undefined;
  const googleId = toTrimmedString(searchParams.get('googleId')) ?? undefined;
  if (!id && !email && !googleId) return null;
  return { id, email, googleId };
}

export function buildAuthStatus(user: LeanAuthUser): AuthStatusResponse {
  const role = isRole(user.role) ? user.role : undefined;
  const username = typeof user.username === 'string' ? user.username : undefined;
  const isRegistered = computeRegistrationState(role, username, user.isRegistered);
  const deleted = Boolean(user.deletedAt);

  return {
    found: true,
    id: user._id.toString(),
    role,
    username,
    isRegistered,
    needsOnboarding: !isRegistered,
    authMethod: isAuthMethod(user.authMethod) ? user.authMethod : undefined,
    banned: user.banned === true,
    isActive: user.isActive !== false && !deleted,
    deleted,
    sessionVersion: user.updatedAt?.getTime(),
  };
}

export const NOT_FOUND_RESPONSE: AuthStatusResponse = {
  found: false,
  isRegistered: false,
  needsOnboarding: false,
  banned: false,
  isActive: false,
  deleted: false,
};
