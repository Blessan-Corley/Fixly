import { env } from '@/lib/env';

/**
 * Returns true when a service-layer message indicates a temporary outage.
 * Used to map degraded-Redis / service-unavailable responses to 503 instead of 400.
 */
export function isTemporarilyUnavailable(message: string | undefined): boolean {
  return typeof message === 'string' && /temporarily unavailable/i.test(message);
}

/**
 * Extracts the real client IP from request headers.
 * Prefers x-real-ip, then the first entry in x-forwarded-for.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

/**
 * Returns true if the request origin matches the configured NEXTAUTH_URL host,
 * or if there is no Origin header (same-origin server request).
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(env.NEXTAUTH_URL).host;
  } catch {
    return false;
  }
}
