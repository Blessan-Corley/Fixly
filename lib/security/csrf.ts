// Phase 2: Replaced legacy ID-based CSRF checks with session token validation middleware.
import { NextRequest, NextResponse } from 'next/server';

import { validateCsrfToken } from '@/lib/security/csrf.server';

const NEXTAUTH_EXEMPT_SEGMENTS = new Set([
  'signin',
  'signout',
  'callback',
  'csrf',
  'session',
  'providers',
  'verify-request',
]);

type CsrfRequest = Request | NextRequest;
type SessionWithCsrf =
  | {
      user?: Record<string, unknown> | null;
    }
  | null
  | undefined;

function isNextAuthRoute(pathname: string): boolean {
  if (!pathname.startsWith('/api/auth/')) {
    return false;
  }

  const segment = pathname.split('/')[3];
  return typeof segment === 'string' && NEXTAUTH_EXEMPT_SEGMENTS.has(segment);
}

function getPathname(request: CsrfRequest): string {
  if ('nextUrl' in request && request.nextUrl) {
    return request.nextUrl.pathname;
  }

  try {
    return new URL(request.url).pathname;
  } catch {
    return '/';
  }
}

export function isCsrfExempt(request: CsrfRequest): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const pathname = getPathname(request);
  if (pathname.startsWith('/api/stripe')) {
    return true;
  }

  // Inngest uses its own HMAC signing key for verification
  if (pathname.startsWith('/api/inngest')) {
    return true;
  }

  if (isNextAuthRoute(pathname)) {
    return true;
  }

  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {
    return false;
  }
  // Require a substantive token — reject trivially short values that indicate
  // a client is using "Bearer <anything>" purely as a CSRF bypass.
  const token = authorization.slice(7).trim();
  return token.length >= 20;
}

export function validateCsrfMiddleware(
  request: CsrfRequest,
  session: SessionWithCsrf
): NextResponse | null {
  if (isCsrfExempt(request)) {
    return null;
  }

  const validation = validateCsrfToken(request, session ?? null);
  if (validation.valid) {
    return null;
  }

  return NextResponse.json(
    {
      error: 'CSRF_INVALID',
      message: 'Invalid or missing CSRF token',
      reason: validation.reason,
    },
    { status: 403 }
  );
}

export const csrfGuard = validateCsrfMiddleware;
