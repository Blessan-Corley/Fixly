import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetToken = vi.fn();
vi.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    NEXTAUTH_SECRET: 'test-secret',
    NEXTAUTH_URL: 'http://localhost:3000',
    AUTH_STATUS_SECRET: undefined,
    MAINTENANCE_MODE: undefined,
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';

import middleware from '@/middleware';

function makeRequest(pathname: string, origin = 'http://localhost:3000'): NextRequest {
  return new NextRequest(`${origin}${pathname}`);
}

type TokenFields = {
  id?: string;
  role?: string;
  username?: string;
  isRegistered?: boolean;
  isNewUser?: boolean;
  authMethod?: string;
  banned?: boolean;
  isActive?: boolean;
  deleted?: boolean;
  authDataRefreshedAt?: number;
  exp?: number;
};

/** A fully-registered hirer token with non-zero timestamp ObjectId */
const registeredHirerToken: TokenFields = {
  id: '507f1f77bcf86cd799439011',
  role: 'hirer',
  username: 'hireruser',
  isRegistered: true,
  authMethod: 'email',
  banned: false,
  isActive: true,
  deleted: false,
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const registeredFixerToken: TokenFields = {
  ...registeredHirerToken,
  id: '507f1f77bcf86cd799439012',
  role: 'fixer',
  username: 'fixeruser',
};

const adminToken: TokenFields = {
  ...registeredHirerToken,
  id: '507f1f77bcf86cd799439013',
  role: 'admin',
  username: 'adminuser',
};

const disabledToken: TokenFields = {
  ...registeredHirerToken,
  banned: true,
};

const unregisteredGoogleToken: TokenFields = {
  id: '507f1f77bcf86cd799439014',
  role: undefined,
  username: 'tmp_abc123',
  isRegistered: false,
  authMethod: 'google',
  banned: false,
  isActive: true,
  deleted: false,
  exp: Math.floor(Date.now() / 1000) + 3600,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no token (unauthenticated)
    mockGetToken.mockResolvedValue(null);
    // No live-auth fetch by default
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ found: true }), { status: 200 })));
  });

  // ── Public paths ─────────────────────────────────────────────────────────────

  it('allows unauthenticated access to public pages', async () => {
    const response = await middleware(makeRequest('/'));
    expect(response.status).not.toBe(302);
  });

  it('allows unauthenticated access to /auth/signin', async () => {
    const response = await middleware(makeRequest('/auth/signin'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows unauthenticated access to /about', async () => {
    const response = await middleware(makeRequest('/about'));
    expect(response.headers.get('location')).toBeNull();
  });

  // ── Maintenance mode ──────────────────────────────────────────────────────────

  it('redirects all non-maintenance paths when MAINTENANCE_MODE is true', async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).MAINTENANCE_MODE = 'true';

    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/maintenance');

    (env as Record<string, unknown>).MAINTENANCE_MODE = undefined;
  });

  it('does not redirect /maintenance itself in maintenance mode', async () => {
    const { env } = await import('@/lib/env');
    (env as Record<string, unknown>).MAINTENANCE_MODE = 'true';

    const response = await middleware(makeRequest('/maintenance'));
    expect(response.headers.get('location')).toBeNull();

    (env as Record<string, unknown>).MAINTENANCE_MODE = undefined;
  });

  // ── Dashboard auth guard ──────────────────────────────────────────────────────

  it('redirects unauthenticated requests to /dashboard → /auth/signin', async () => {
    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/signin');
  });

  it('allows authenticated hirer into /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects disabled account from /dashboard with AccessDenied', async () => {
    mockGetToken.mockResolvedValue(disabledToken);
    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('/auth/signin');
    expect(location).toContain('AccessDenied');
  });

  // ── Signup completion redirect ────────────────────────────────────────────────

  it('redirects unregistered Google user from /dashboard → /auth/signup?method=google', async () => {
    mockGetToken.mockResolvedValue(unregisteredGoogleToken);
    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('/auth/signup');
    expect(location).toContain('method=google');
  });

  it('redirects unregistered non-google user from /dashboard → /auth/signup', async () => {
    mockGetToken.mockResolvedValue({
      ...unregisteredGoogleToken,
      authMethod: 'email',
      role: 'hirer',
    });
    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('/auth/signup');
    expect(location).toContain('role=hirer');
  });

  // ── Registered user → auth page redirect ─────────────────────────────────────

  it('redirects fully registered user away from /auth/signin → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/auth/signin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('does NOT redirect registered user from /auth/signout', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/auth/signout'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('does NOT redirect registered user from /auth/error page', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/auth/error'));
    expect(response.headers.get('location')).toBeNull();
  });

  // ── Admin route guard ─────────────────────────────────────────────────────────

  it('redirects unauthenticated request to /admin → /auth/signin?admin=true', async () => {
    const response = await middleware(makeRequest('/admin'));
    expect(response.status).toBe(307);
    const location = response.headers.get('location') ?? '';
    expect(location).toContain('/auth/signin');
    expect(location).toContain('admin=true');
  });

  it('redirects non-admin authenticated user from /admin → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('allows admin user into /admin', async () => {
    mockGetToken.mockResolvedValue(adminToken);
    const response = await middleware(makeRequest('/admin'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows /admin/setup without authentication', async () => {
    const response = await middleware(makeRequest('/admin/setup'));
    // Should not redirect to /auth/signin for /admin/setup
    const location = response.headers.get('location') ?? '';
    expect(location).not.toContain('/auth/signin');
  });

  // ── Dashboard admin sub-route ──────────────────────────────────────────────────

  it('redirects non-admin from /dashboard/admin → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/admin'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
    expect(response.headers.get('location')).not.toContain('/dashboard/admin');
  });

  it('allows admin into /dashboard/admin', async () => {
    mockGetToken.mockResolvedValue(adminToken);
    const response = await middleware(makeRequest('/dashboard/admin'));
    expect(response.headers.get('location')).toBeNull();
  });

  // ── Role-gated fixer routes ───────────────────────────────────────────────────

  it('allows fixer into /dashboard/browse-jobs', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/browse-jobs'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects hirer from /dashboard/browse-jobs → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/browse-jobs'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('allows fixer into /dashboard/applications', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/applications'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects hirer from /dashboard/applications → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/applications'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('allows fixer into /dashboard/earnings', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/earnings'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows fixer into /dashboard/subscription', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/subscription'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects hirer from /dashboard/subscription → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/subscription'));
    expect(response.status).toBe(307);
  });

  // ── Role-gated hirer routes ───────────────────────────────────────────────────

  it('allows hirer into /dashboard/post-job', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/post-job'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects fixer from /dashboard/post-job → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/post-job'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('allows hirer into /dashboard/find-fixers', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/find-fixers'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects fixer from /dashboard/find-fixers → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/find-fixers'));
    expect(response.status).toBe(307);
  });

  // ── Jobs sub-routes ───────────────────────────────────────────────────────────

  it('allows hirer into /dashboard/jobs', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/jobs'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows fixer into job detail page /dashboard/jobs/507f1f77bcf86cd799439011', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/jobs/507f1f77bcf86cd799439011'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows fixer into /dashboard/jobs/:id/apply', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/jobs/507f1f77bcf86cd799439011/apply'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects fixer from non-allowed jobs sub-paths → /dashboard', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/jobs/507f1f77bcf86cd799439011/edit'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/dashboard');
  });

  it('allows admin into /dashboard/jobs', async () => {
    mockGetToken.mockResolvedValue(adminToken);
    const response = await middleware(makeRequest('/dashboard/jobs'));
    expect(response.headers.get('location')).toBeNull();
  });

  // ── Deleted/inactive account ──────────────────────────────────────────────────

  it('redirects deleted account from /dashboard with AccessDenied', async () => {
    mockGetToken.mockResolvedValue({ ...registeredHirerToken, deleted: true });
    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('AccessDenied');
  });

  it('redirects inactive account from /dashboard with AccessDenied', async () => {
    mockGetToken.mockResolvedValue({ ...registeredHirerToken, isActive: false });
    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('AccessDenied');
  });

  // ── Live auth state: deleted user ─────────────────────────────────────────────

  it('redirects with AccessDenied when live auth says user no longer found', async () => {
    // Token near expiry triggers live auth fetch
    const nearExpiryToken = {
      ...registeredHirerToken,
      exp: Math.floor(Date.now() / 1000) + 20, // 20s left → within 30s window → triggers live fetch
    };
    mockGetToken.mockResolvedValue(nearExpiryToken);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ found: false, isActive: false }), { status: 200 })
      )
    );

    const response = await middleware(makeRequest('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('AccessDenied');
  });

  // ── Shared dashboard pages ────────────────────────────────────────────────────

  it('allows hirer into /dashboard/messages', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/messages'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows fixer into /dashboard/profile', async () => {
    mockGetToken.mockResolvedValue(registeredFixerToken);
    const response = await middleware(makeRequest('/dashboard/profile'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows hirer into /dashboard/settings', async () => {
    mockGetToken.mockResolvedValue(registeredHirerToken);
    const response = await middleware(makeRequest('/dashboard/settings'));
    expect(response.headers.get('location')).toBeNull();
  });
});
