import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { env } from '@/lib/env';
import {
  type CustomToken,
  fetchLiveAuthState,
  isAccountDisabled,
  mergeTokenWithLiveState,
  needsSignupCompletion,
  redirectToSignIn,
  shouldRefreshLiveAuthState,
} from '@/lib/middleware/auth-checks';

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
    if (!token) return redirectToSignIn(request, { admin: 'true' });
    if (isAccountDisabled(token)) return redirectToSignIn(request, { error: 'AccessDenied' });
    if (token.role !== 'admin') return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/dashboard')) {
    if (!token) return redirectToSignIn(request);
    if (isAccountDisabled(token)) return redirectToSignIn(request, { error: 'AccessDenied' });
  }

  if (token && pathname.startsWith('/dashboard') && needsSignupCompletion(token)) {
    const redirectUrl = new URL('/auth/signup', request.url);
    if (token.authMethod === 'google') redirectUrl.searchParams.set('method', 'google');
    if (token.role && token.authMethod !== 'google') redirectUrl.searchParams.set('role', token.role);
    return NextResponse.redirect(redirectUrl);
  }

  if (
    token?.isRegistered &&
    token.id &&
    (pathname === '/' ||
      (pathname.startsWith('/auth/') &&
        !pathname.includes('/signout') &&
        !pathname.includes('/error')))
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // At this point, token is non-null for any /dashboard or /admin route
  // because both blocks above return early when !token. Other routes
  // (e.g. public pages) may still have token === null here, so
  // role-gating checks below must only run inside the relevant startsWith guards.
  const t = token as NonNullable<CustomToken>;

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
    if (t.role === 'admin') return NextResponse.next();
    if (t.role === 'fixer') {
      if (pathname.includes('/apply') || pathname.match(/^\/dashboard\/jobs\/[^/]+$/)) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (t.role === 'hirer') return NextResponse.next();
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|icons|images).*)'],
};
