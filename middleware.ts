import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';

type CustomToken = {
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

type LiveAuthState = {
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

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

function needsSignupCompletion(token: CustomToken | null): boolean {
  if (!token) {
    return false;
  }

  const hasValidUsername =
    typeof token.username === 'string' &&
    !token.username.startsWith('tmp_') &&
    !token.username.startsWith('temp_');

  return !(token.role && hasValidUsername && token.isRegistered);
}

function isAccountDisabled(token: CustomToken | null): boolean {
  if (!token) {
    return false;
  }

  return token.banned === true || token.isActive === false || token.deleted === true;
}

function isValidObjectId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length !== 24) return false;
  if (!/^[0-9a-fA-F]{24}$/i.test(value)) return false;
  // Reject all-zero ObjectIds and ensure timestamp portion is non-zero
  return Number.parseInt(value.substring(0, 8), 16) > 0;
}

function hasRequiredAuthFields(token: CustomToken | null): boolean {
  if (!token) {
    return false;
  }

  const hasStateFlags =
    typeof token.banned === 'boolean' &&
    typeof token.isActive === 'boolean' &&
    typeof token.isRegistered === 'boolean';

  if (!hasStateFlags) {
    return false;
  }

  if (token.isRegistered === false) {
    return typeof token.authMethod === 'string';
  }

  return (
    typeof token.role === 'string' &&
    token.role.length > 0 &&
    typeof token.username === 'string' &&
    token.username.length > 0
  );
}

function isTokenNearExpiry(token: CustomToken | null): boolean {
  if (!token || typeof token.exp !== 'number') {
    return false;
  }

  return token.exp * 1000 - Date.now() <= TOKEN_REFRESH_WINDOW_MS;
}

function shouldRefreshLiveAuthState(token: CustomToken | null): boolean {
  if (!token || !isValidObjectId(token.id)) {
    return false;
  }

  return !hasRequiredAuthFields(token) || isTokenNearExpiry(token);
}

async function fetchLiveAuthState(
  request: NextRequest,
  token: CustomToken | null
): Promise<LiveAuthState | null> {
  if (!token || !isValidObjectId(token.id)) {
    return null;
  }

  const internalSecret = env.AUTH_STATUS_SECRET ?? env.NEXTAUTH_SECRET;
  if (!internalSecret) {
    return null;
  }

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

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<LiveAuthState>;
    if (typeof payload.found !== 'boolean') {
      return null;
    }

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

function mergeTokenWithLiveState(
  token: CustomToken | null,
  liveState: LiveAuthState | null
): CustomToken | null {
  if (!token || !liveState) {
    return token;
  }

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

function redirectToSignIn(request: NextRequest, query?: Record<string, string>): NextResponse {
  const url = new URL('/auth/signin', request.url);
  Object.entries(query || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

export default async function middleware(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl;

  if (env.MAINTENANCE_MODE === 'true') {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith('/maintenance') && !url.pathname.startsWith('/api/health')) {
      url.pathname = '/maintenance';
      return NextResponse.redirect(url);
    }
  }

  const rawToken = (await getToken({
    req: request,
    secret: env.NEXTAUTH_SECRET,
  })) as CustomToken | null;

  const liveState = shouldRefreshLiveAuthState(rawToken)
    ? await fetchLiveAuthState(request, rawToken)
    : null;
  const token = mergeTokenWithLiveState(rawToken, liveState);

  if (rawToken && liveState?.found === false && pathname !== '/auth/signin') {
    return redirectToSignIn(request, { error: 'AccessDenied' });
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin/setup') {
    if (!token) {
      return redirectToSignIn(request, { admin: 'true' });
    }

    if (isAccountDisabled(token)) {
      return redirectToSignIn(request, { error: 'AccessDenied' });
    }

    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return redirectToSignIn(request);
    }

    if (isAccountDisabled(token)) {
      return redirectToSignIn(request, { error: 'AccessDenied' });
    }
  }

  if (token && pathname.startsWith('/dashboard') && needsSignupCompletion(token)) {
    const redirectUrl = new URL('/auth/signup', request.url);

    if (token.authMethod === 'google') {
      redirectUrl.searchParams.set('method', 'google');
    }

    if (token.role && token.authMethod !== 'google') {
      redirectUrl.searchParams.set('role', token.role);
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (token && token.isNewUser && !token.id && pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/auth/signup', request.url);
    redirectUrl.searchParams.set('method', 'google');
    return NextResponse.redirect(redirectUrl);
  }

  if (
    token &&
    token.isRegistered &&
    token.id &&
    pathname.startsWith('/auth/') &&
    !pathname.includes('/signout')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // token is guaranteed non-null past the /dashboard guard above —
  // no need to re-check !token in any sub-dashboard guard.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const t = token!;

  if (pathname.startsWith('/dashboard/admin') && t.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (
    (pathname.startsWith('/dashboard/browse-jobs') ||
      pathname.startsWith('/dashboard/applications') ||
      pathname.startsWith('/dashboard/earnings') ||
      pathname.startsWith('/dashboard/subscription')) &&
    t.role !== 'fixer'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (
    (pathname.startsWith('/dashboard/post-job') || pathname.startsWith('/dashboard/find-fixers')) &&
    t.role !== 'hirer'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/dashboard/jobs')) {
    if (t.role === 'admin') {
      return NextResponse.next();
    }

    if (t.role === 'fixer') {
      if (pathname.includes('/apply') || pathname.match(/^\/dashboard\/jobs\/[^/]+$/)) {
        return NextResponse.next();
      }

      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (t.role === 'hirer') {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|icons|images).*)'],
};
