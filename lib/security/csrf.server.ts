// Phase 2: Replaced predictable CSRF tokens with per-session cryptographic tokens.
import 'server-only';

import { randomBytes, timingSafeEqual } from 'crypto';

type SessionWithCsrf = {
  user?: Record<string, unknown> | null;
};

type CsrfValidationResult =
  | { valid: true }
  | { valid: false; reason: 'MISSING_SESSION_TOKEN' | 'MISSING_HEADER_TOKEN' | 'TOKEN_MISMATCH' };

type CsrfRequest = Request;

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function getCsrfToken(session: SessionWithCsrf | null | undefined): string | null {
  return asNonEmptyString(session?.user?.csrfToken);
}

export function validateCsrfToken(
  request: CsrfRequest,
  session: SessionWithCsrf | null | undefined
): CsrfValidationResult {
  const sessionToken = getCsrfToken(session);
  if (!sessionToken) {
    return { valid: false, reason: 'MISSING_SESSION_TOKEN' };
  }

  const headerToken = asNonEmptyString(
    request.headers.get('x-csrf-token') ?? request.headers.get('csrf-token')
  );
  if (!headerToken) {
    return { valid: false, reason: 'MISSING_HEADER_TOKEN' };
  }

  const sessionBuffer = Buffer.from(sessionToken, 'utf8');
  const headerBuffer = Buffer.from(headerToken, 'utf8');
  if (sessionBuffer.length !== headerBuffer.length) {
    return { valid: false, reason: 'TOKEN_MISMATCH' };
  }

  return timingSafeEqual(sessionBuffer, headerBuffer)
    ? { valid: true }
    : { valid: false, reason: 'TOKEN_MISMATCH' };
}
