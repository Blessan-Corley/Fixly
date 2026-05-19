// Phase 2: Replaced legacy ID-based CSRF checks with session token validation middleware.
import { createHmac, timingSafeEqual } from 'crypto';

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
  if (pathname.startsWith('/api/razorpay/webhook')) {
    return true;
  }

  // Inngest uses its own HMAC signing key for verification
  if (pathname.startsWith('/api/inngest')) {
    return true;
  }

  if (isNextAuthRoute(pathname)) {
    return true;
  }

  // Bearer tokens are only valid for internal server-to-server calls.
  // They must be HMAC-SHA256(NEXTAUTH_SECRET, "internal-api-v1") — anything else
  // is rejected. This prevents a client from bypassing CSRF with arbitrary headers.
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {
    return false;
  }
  const token = authorization.slice(7).trim();
  if (!token) return false;

  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return false;
    const expected = createHmac('sha256', secret).update('internal-api-v1').digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const tokenBuf = Buffer.from(token, 'utf8');
    return (
      expectedBuf.length === tokenBuf.length && timingSafeEqual(expectedBuf, tokenBuf)
    );
  } catch {
    return false;
  }
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
