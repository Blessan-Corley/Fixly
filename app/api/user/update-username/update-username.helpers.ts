import { apiError, respond } from '@/lib/api';
import { isTemporarilyUnavailable } from '@/lib/api/request';

export { isTemporarilyUnavailable };

export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildRateLimitResponse(
  degraded: boolean,
  resetTime: number | undefined
): Response {
  if (degraded) {
    return apiError(
      'SERVICE_UNAVAILABLE',
      'Username update is temporarily unavailable. Please try again shortly.',
      503
    );
  }

  const retryAfter = Math.max(
    0,
    Math.ceil(((resetTime ?? Date.now() + 3600_000) - Date.now()) / 1000)
  );

  return respond(
    {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many username update attempts. Please try again later.' },
      retryAfter,
      resetTime: new Date(resetTime ?? Date.now() + retryAfter * 1000).toISOString(),
    },
    429,
    { headers: { 'Retry-After': String(retryAfter) } }
  );
}
