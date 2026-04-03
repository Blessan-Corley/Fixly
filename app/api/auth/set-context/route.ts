// Phase 2: Simplified auth-context parsing to avoid fragile request re-wrapping in integration tests.
import { handleRouteError } from '@/lib/api/errors';
import { parseBody } from '@/lib/api/parse';
import { badRequest, ok } from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { authSlidingRateLimit } from '@/lib/redis';
import { SetContextSchema } from '@/lib/validations/context';

type SetContextBody = {
  context?: unknown;
};

type AuthContext = 'signup' | 'signin';
const AUTH_CONTEXT_COOKIE_NAME =
  env.NODE_ENV === 'production' ? '__Secure-fixly-auth-context' : 'fixly-auth-context';

function toAuthContext(value: unknown): AuthContext | null {
  if (value === 'signup' || value === 'signin') return value;
  return null;
}

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(env.NEXTAUTH_URL).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!isAllowedOrigin(request)) {
      return badRequest('Forbidden');
    }

    const ip =
      request.headers.get('x-real-ip')?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const limit = await authSlidingRateLimit(`set_context:${ip}`, 20, 60);
    if (!limit.success && !limit.degraded) {
      return new Response(JSON.stringify({ message: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const parsed = await parseBody(request, SetContextSchema);
    if ('error' in parsed) return parsed.error;

    const context = toAuthContext(parsed.data.context);
    if (!context) {
      return badRequest('Invalid context. Must be "signup" or "signin"');
    }

    const response = ok({ context });
    response.cookies.set(AUTH_CONTEXT_COOKIE_NAME, context, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    logger.error({ error }, 'Error setting auth context');
    return handleRouteError(error);
  }
}
