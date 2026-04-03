jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  getCsrfToken: jest.fn(),
  generateCsrfToken: jest.fn(() => 'mock-generated-csrf-token'),
  validateCsrfToken: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { getServerSession } from 'next-auth/next';
import { GET } from '@/app/api/auth/csrf-token/route';
import { getCsrfToken } from '@/lib/security/csrf.server';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SESSION_USER_ID = '507f1f77bcf86cd799439011';
const CSRF_TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

function makeRequest(): Request {
  return new Request('http://localhost/api/auth/csrf-token', { method: 'GET' });
}

function makeSession(csrfToken: string | null = CSRF_TOKEN): object {
  return {
    user: { id: SESSION_USER_ID, csrfToken },
    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────────

describe('/api/auth/csrf-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(makeSession());
    (getCsrfToken as jest.Mock).mockReturnValue(CSRF_TOKEN);
  });

  // ── Authentication ───────────────────────────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: {} });

    const response = await GET();

    expect(response.status).toBe(401);
  });

  // ── CSRF token missing ───────────────────────────────────────────────────────

  it('returns 500 when session has no CSRF token', async () => {
    (getCsrfToken as jest.Mock).mockReturnValue(null);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain('CSRF');
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('returns 200 with csrfToken when authenticated', async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
  });

  it('includes the csrfToken from the session in the response', async () => {
    const response = await GET();
    const payload = await response.json();

    // apiSuccess wraps in { data: { csrfToken } } or direct { csrfToken }
    const token = payload.data?.csrfToken ?? payload.csrfToken;
    expect(token).toBe(CSRF_TOKEN);
  });

  it('calls getCsrfToken with the session', async () => {
    await GET();

    expect(getCsrfToken).toHaveBeenCalledTimes(1);
  });
});
