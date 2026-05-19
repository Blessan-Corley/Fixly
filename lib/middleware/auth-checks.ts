import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';

export type CustomToken = {
  role?: string;
  username?: string;
  isRegistered?: boolean;
  isNewUser?: boolean;
  id?: string;
  email?: string;
  googleId?: string;
  authMethod?: string;
  banned?: boolean;
  isActive?: boolean;
  deleted?: boolean;
  authDataRefreshedAt?: number;
  exp?: number;
};

export type LiveAuthState = {
  found: boolean;
  role?: string;
  username?: string;
  isRegistered: boolean;
  needsOnboarding: boolean;
  authMethod?: string;
  banned: boolean;
  isActive: boolean;
  deleted: boolean;
};

// Trigger a live auth-state refresh when the JWT is within 30 seconds of expiry.
// 5 minutes was too wide — it caused an HTTP fetch to /api/auth/status on every
// request for the last 5 minutes of every 7-day session, hammering Redis + DB.
const TOKEN_REFRESH_WINDOW_MS = 30 * 1000;

export function needsSignupCompletion(token: CustomToken | null): boolean {
  if (!token) return false;
  const hasValidUsername =
    typeof token.username === 'string' &&
    !token.username.startsWith('tmp_') &&
    !token.username.startsWith('temp_');
  return !(token.role && hasValidUsername && token.isRegistered);
}

export function isAccountDisabled(token: CustomToken | null): boolean {
  if (!token) return false;
  return token.banned === true || token.isActive === false || token.deleted === true;
}

function isValidObjectId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length !== 24) return false;
  if (!/^[0-9a-fA-F]{24}$/i.test(value)) return false;
  return Number.parseInt(value.substring(0, 8), 16) > 0;
}

function hasRequiredAuthFields(token: CustomToken | null): boolean {
  if (!token) return false;
  const hasStateFlags =
    typeof token.banned === 'boolean' &&
    typeof token.isActive === 'boolean' &&
    typeof token.isRegistered === 'boolean';
  if (!hasStateFlags) return false;
  if (token.isRegistered === false) return typeof token.authMethod === 'string';
  return (
    typeof token.role === 'string' &&
    token.role.length > 0 &&
    typeof token.username === 'string' &&
    token.username.length > 0
  );
}

function isTokenNearExpiry(token: CustomToken | null): boolean {
  if (!token || typeof token.exp !== 'number') return false;
  return token.exp * 1000 - Date.now() <= TOKEN_REFRESH_WINDOW_MS;
}

export function shouldRefreshLiveAuthState(token: CustomToken | null): boolean {
  if (!token || !isValidObjectId(token.id)) return false;
  return !hasRequiredAuthFields(token) || isTokenNearExpiry(token);
}

export async function fetchLiveAuthState(
  request: NextRequest,
  token: CustomToken | null
): Promise<LiveAuthState | null> {
  if (!token || !isValidObjectId(token.id)) return null;

  const internalSecret = env.AUTH_STATUS_SECRET ?? env.NEXTAUTH_SECRET;
  if (!internalSecret) return null;

  try {
    const url = new URL('/api/auth/status', request.nextUrl.origin);
    url.searchParams.set('id', token.id);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'x-internal-auth-key': internalSecret },
        cache: 'no-store',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) return null;

    const payload = (await response.json()) as Partial<LiveAuthState>;
    if (typeof payload.found !== 'boolean') return null;

    return {
      found: payload.found,
      role: payload.role,
      username: payload.username,
      isRegistered: payload.isRegistered === true,
      needsOnboarding: payload.needsOnboarding === true,
      authMethod: payload.authMethod,
      banned: payload.banned === true,
      isActive: payload.isActive !== false,
      deleted: payload.deleted === true,
    };
  } catch {
    return null;
  }
}

export function mergeTokenWithLiveState(
  token: CustomToken | null,
  liveState: LiveAuthState | null
): CustomToken | null {
  if (!token || !liveState) return token;
  return {
    ...token,
    role: liveState.role ?? token.role,
    username: liveState.username ?? token.username,
    isRegistered: liveState.isRegistered,
    authMethod: liveState.authMethod ?? token.authMethod,
    banned: liveState.banned,
    isActive: liveState.isActive,
    deleted: liveState.deleted,
    authDataRefreshedAt: Date.now(),
  };
}

export function redirectToSignIn(
  request: NextRequest,
  query?: Record<string, string>
): NextResponse {
  const url = new URL('/auth/signin', request.url);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url);
}
