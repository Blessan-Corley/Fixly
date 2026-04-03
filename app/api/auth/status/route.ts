import { respond } from '@/lib/api';
import { isValidObjectId } from '@/lib/auth-utils';
import { env } from '@/lib/env';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { withServiceFallback } from '@/lib/resilience/serviceGuard';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AuthStatusLookup = {
  id?: string;
  email?: string;
  googleId?: string;
};

type AuthStatusResponse = {
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

type CachedAuthStatus = AuthStatusResponse & {
  lastUpdated: number;
};

type LeanAuthUser = {
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

const CACHE_TTL_SECONDS = 30;
const INTERNAL_AUTH_STATUS_HEADER = 'x-internal-auth-key';
const TEMPORARY_USERNAME_PREFIXES = ['tmp_', 'temp_'] as const;

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRole(value: unknown): value is 'hirer' | 'fixer' | 'admin' {
  return value === 'hirer' || value === 'fixer' || value === 'admin';
}

function isAuthMethod(value: unknown): value is 'email' | 'google' | 'phone' {
  return value === 'email' || value === 'google' || value === 'phone';
}

function isTemporaryUsername(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    TEMPORARY_USERNAME_PREFIXES.some((prefix) => value.startsWith(prefix))
  );
}

function computeRegistrationState(
  role: unknown,
  username: unknown,
  isRegistered: unknown
): boolean {
  return Boolean(
    isRegistered === true &&
    isRole(role) &&
    typeof username === 'string' &&
    username.trim().length > 0 &&
    !isTemporaryUsername(username)
  );
}

function isInternalRequest(request: Request): boolean {
  const configuredSecret = env.AUTH_STATUS_SECRET ?? env.NEXTAUTH_SECRET;
  if (!configuredSecret) {
    return env.NODE_ENV !== 'production';
  }

  return request.headers.get(INTERNAL_AUTH_STATUS_HEADER) === configuredSecret;
}

function buildLookup(searchParams: URLSearchParams): AuthStatusLookup | null {
  const id = toTrimmedString(searchParams.get('id')) ?? undefined;
  const email = toTrimmedString(searchParams.get('email'))?.toLowerCase() ?? undefined;
  const googleId = toTrimmedString(searchParams.get('googleId')) ?? undefined;

  if (!id && !email && !googleId) {
    return null;
  }

  return { id, email, googleId };
}

function buildAuthStatus(user: LeanAuthUser): AuthStatusResponse {
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

export async function GET(request: Request): Promise<Response> {
  if (!isInternalRequest(request)) {
    return respond({ found: false, message: 'Unauthorized' }, 401);
  }

  const { searchParams } = new URL(request.url);
  const lookup = buildLookup(searchParams);
  if (!lookup) {
    return respond({ found: false, message: 'Lookup parameters are required' }, 400);
  }

  const cacheKey = isValidObjectId(lookup.id) ? `auth_status:${lookup.id}` : null;
  if (cacheKey) {
    const cached = await withServiceFallback(
      () => redisUtils.get<CachedAuthStatus>(cacheKey),
      null,
      'auth-status-cache-get'
    );
    if (cached && typeof cached === 'object' && cached !== null && typeof cached.found === 'boolean') {
      return respond(cached, 200, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
  }

  await connectDB();

  const userLookup: Array<Record<string, unknown>> = [];
  if (isValidObjectId(lookup.id)) {
    userLookup.push({ _id: lookup.id });
  }
  if (lookup.email) {
    userLookup.push({ email: lookup.email });
  }
  if (lookup.googleId) {
    userLookup.push({ googleId: lookup.googleId });
  }

  const user =
    userLookup.length > 0
      ? await User.findOne({ $or: userLookup })
          .select('role username isRegistered authMethod banned isActive deletedAt updatedAt')
          .lean<LeanAuthUser | null>()
      : null;

  if (!user) {
    const notFoundResponse: AuthStatusResponse = {
      found: false,
      isRegistered: false,
      needsOnboarding: false,
      banned: false,
      isActive: false,
      deleted: false,
    };
    // Cache the miss so repeated lookups for deleted/non-existent users do not
    // hit MongoDB on every middleware request (short TTL — same 30 s window).
    if (cacheKey) {
      await withServiceFallback(
        () =>
          redisUtils.set(
            cacheKey,
            { ...notFoundResponse, lastUpdated: Date.now() } satisfies CachedAuthStatus,
            CACHE_TTL_SECONDS
          ),
        false,
        'auth-status-cache-set-miss'
      );
    }
    return respond(notFoundResponse, 200, { headers: { 'Cache-Control': 'no-store' } });
  }

  const status = buildAuthStatus(user);
  if (cacheKey && status.id) {
    await withServiceFallback(
      () =>
        redisUtils.set(
          cacheKey,
          {
            ...status,
            lastUpdated: Date.now(),
          } satisfies CachedAuthStatus,
          CACHE_TTL_SECONDS
        ),
      false,
      'auth-status-cache-set'
    );
  }

  return respond(status, 200, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
