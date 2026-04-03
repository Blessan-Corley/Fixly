// Phase 2: Added unit coverage for per-session CSRF token generation and validation.
jest.mock('server-only', () => ({}));

import { generateCsrfToken, getCsrfToken, validateCsrfToken } from '@/lib/security/csrf.server';

describe('csrf.server', () => {
  it('generates a 64-character hexadecimal token', () => {
    const token = generateCsrfToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('reads the token from an authenticated session', () => {
    expect(
      getCsrfToken({
        user: {
          csrfToken: 'test-session-token',
        },
      })
    ).toBe('test-session-token');
  });

  it('rejects requests without a header token', () => {
    const result = validateCsrfToken(
      new Request('http://localhost/api/messages', {
        method: 'POST',
      }),
      {
        user: {
          csrfToken: 'a'.repeat(64),
        },
      }
    );

    expect(result).toEqual({
      valid: false,
      reason: 'MISSING_HEADER_TOKEN',
    });
  });

  it('accepts requests with a matching header token', () => {
    const token = 'b'.repeat(64);
    const result = validateCsrfToken(
      new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
        },
      }),
      {
        user: {
          csrfToken: token,
        },
      }
    );

    expect(result).toEqual({ valid: true });
  });
});
