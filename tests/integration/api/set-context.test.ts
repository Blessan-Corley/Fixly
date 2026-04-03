jest.mock('@/lib/redis', () => ({
  authSlidingRateLimit: jest.fn(),
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    NEXTAUTH_URL: 'http://localhost:3000',
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from '@/app/api/auth/set-context/route';
import { authSlidingRateLimit } from '@/lib/redis';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/auth/set-context', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

// ── Setup ──────────────────────────────────────────────────────────────────────

describe('/api/auth/set-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: true, degraded: false });
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('stores a valid "signup" auth context cookie', async () => {
    const response = await POST(makeRequest({ context: 'signup' }));

    expect(response.status).toBe(200);
    const cookieHeader = response.headers.get('set-cookie') || '';
    expect(cookieHeader).toContain('fixly-auth-context=signup');
  });

  it('stores a valid "signin" auth context cookie', async () => {
    const response = await POST(makeRequest({ context: 'signin' }));

    expect(response.status).toBe(200);
    const cookieHeader = response.headers.get('set-cookie') || '';
    expect(cookieHeader).toContain('fixly-auth-context=signin');
  });

  it('response body includes the context', async () => {
    const response = await POST(makeRequest({ context: 'signup' }));
    const payload = await response.json();

    // ok() wraps in { success: true, data: { context } }
    expect(payload.data?.context ?? payload.context).toBe('signup');
  });

  // ── Input validation ─────────────────────────────────────────────────────────

  it('rejects unknown auth contexts with 400', async () => {
    const response = await POST(makeRequest({ context: 'admin' }));

    expect(response.status).toBe(400);
  });

  it('rejects missing context field with 400', async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON body with 400', async () => {
    const request = new Request('http://localhost/api/auth/set-context', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('rejects null context with 400', async () => {
    const response = await POST(makeRequest({ context: null }));

    expect(response.status).toBe(400);
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────

  it('returns 429 when rate limited', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: false });

    const response = await POST(makeRequest({ context: 'signup' }));

    expect(response.status).toBe(429);
  });

  it('still processes when rate limiter is degraded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(makeRequest({ context: 'signup' }));

    // degraded means bypass — should still succeed
    expect(response.status).toBe(200);
  });

  // ── Origin validation ────────────────────────────────────────────────────────

  it('allows requests with no origin header (server-to-server)', async () => {
    const request = new Request('http://localhost/api/auth/set-context', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context: 'signup' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('allows requests from the same origin', async () => {
    const response = await POST(
      makeRequest({ context: 'signup' }, { origin: 'http://localhost:3000' })
    );

    expect(response.status).toBe(200);
  });

  it('rejects cross-origin requests with 400', async () => {
    const response = await POST(
      makeRequest({ context: 'signup' }, { origin: 'https://evil.com' })
    );

    expect(response.status).toBe(400);
  });

  // ── Cookie properties ────────────────────────────────────────────────────────

  it('cookie has httpOnly attribute', async () => {
    const response = await POST(makeRequest({ context: 'signup' }));
    const cookieHeader = response.headers.get('set-cookie') || '';

    expect(cookieHeader.toLowerCase()).toContain('httponly');
  });

  it('cookie has max-age set (5 minutes = 300 seconds)', async () => {
    const response = await POST(makeRequest({ context: 'signup' }));
    const cookieHeader = response.headers.get('set-cookie') || '';

    expect(cookieHeader).toContain('Max-Age=300');
  });

  it('cookie has SameSite=Lax', async () => {
    const response = await POST(makeRequest({ context: 'signup' }));
    const cookieHeader = response.headers.get('set-cookie') || '';

    expect(cookieHeader.toLowerCase()).toContain('samesite=lax');
  });
});
