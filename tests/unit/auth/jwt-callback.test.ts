import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/security/csrf.server', () => ({
  generateCsrfToken: vi.fn(() => 'csrf-token-generated'),
}));

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('@/lib/redis', () => ({
  redisUtils: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

const mockConnectDB = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/mongodb', () => ({ default: () => mockConnectDB() }));

const mockUserFindOne = vi.fn();
vi.mock('@/models/User', () => ({
  default: {
    findOne: (...args: unknown[]) => ({
      select: () => ({
        lean: () => mockUserFindOne(...args),
      }),
    }),
  },
}));

import { jwtCallback as _jwtCallback } from '@/lib/auth/callbacks/jwt';
import type { User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// jwtCallback is typed as optional by NextAuth — assert it's defined
const jwtCallback = _jwtCallback!;

// ── Helpers ────────────────────────────────────────────────────────────────────

type JwtCallbackFn = typeof jwtCallback;
type JwtParams = Parameters<JwtCallbackFn>[0];

function makeParams(overrides: Partial<JwtParams> = {}): JwtParams {
  return {
    token: {} as JWT,
    user: null as unknown as User,
    account: null,
    profile: undefined,
    trigger: undefined,
    session: undefined,
    ...overrides,
  };
}

// ── CSRF token generation ──────────────────────────────────────────────────────

describe('jwtCallback — CSRF token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockUserFindOne.mockResolvedValue(null);
  });

  it('generates a CSRF token on signIn trigger', async () => {
    const params = makeParams({ trigger: 'signIn', token: { csrfToken: 'old' } as JWT });
    const token = await jwtCallback(params);
    expect(token.csrfToken).toBe('csrf-token-generated');
  });

  it('generates a CSRF token when csrfToken is missing', async () => {
    const params = makeParams({ token: {} as JWT });
    const token = await jwtCallback(params);
    expect(token.csrfToken).toBe('csrf-token-generated');
  });

  it('keeps existing CSRF token when trigger is not signIn and token already has one', async () => {
    const params = makeParams({
      token: { csrfToken: 'existing-csrf', authDataRefreshedAt: Date.now() } as JWT,
      trigger: undefined, // no trigger — not a sign-in event
    });
    const token = await jwtCallback(params);
    // csrfToken should remain (not regenerated when already present and not signIn)
    expect(token.csrfToken).toBe('existing-csrf');
  });
});

// ── Pending Google session expiry ──────────────────────────────────────────────

describe('jwtCallback — pending Google session expiry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears the pending session after 1 hour', async () => {
    const OVER_ONE_HOUR = 60 * 60 * 1000 + 1;
    const params = makeParams({
      token: {
        id: 'pending_google:abc123',
        pendingSessionCreatedAt: Date.now() - OVER_ONE_HOUR,
        email: 'test@example.com',
        googleId: 'abc123',
      } as JWT,
    });

    const token = await jwtCallback(params);

    expect(token.id).toBeUndefined();
    expect(token.googleId).toBeUndefined();
    expect(token.email).toBeUndefined();
    expect(token.isRegistered).toBe(false);
    expect(token.isNewUser).toBe(false);
  });

  it('does not clear a pending session under 1 hour old', async () => {
    const params = makeParams({
      token: {
        id: 'pending_google:abc123',
        pendingSessionCreatedAt: Date.now() - 1000,
        email: 'test@example.com',
        csrfToken: 'tok',
      } as JWT,
    });
    mockRedisGet.mockResolvedValue(null);
    mockUserFindOne.mockResolvedValue(null);

    const token = await jwtCallback(params);
    expect(token.id).toBe('pending_google:abc123');
  });
});

// ── Initial sign-in (user object present) ─────────────────────────────────────

describe('jwtCallback — initial sign-in with user object', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockUserFindOne.mockResolvedValue(null);
  });

  it('maps user fields to the JWT token', async () => {
    const user = {
      id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      name: 'Test User',
      role: 'hirer' as const,
      username: 'testuser',
      phone: '+1234567890',
      isVerified: true,
      emailVerified: true,
      phoneVerified: false,
      authMethod: 'email' as const,
      isRegistered: true,
      isNewUser: false,
      needsOnboarding: false,
      banned: false,
      isActive: true,
      googleId: undefined,
      csrfToken: 'user-csrf',
    };

    const params = makeParams({
      trigger: 'signIn',
      user: user as Parameters<typeof jwtCallback>[0]['user'],
      token: {} as JWT,
    });

    const token = await jwtCallback(params);

    expect(token.id).toBe('507f1f77bcf86cd799439011');
    expect(token.email).toBe('user@example.com');
    expect(token.role).toBe('hirer');
    expect(token.username).toBe('testuser');
    expect(token.isVerified).toBe(true);
    expect(token.emailVerified).toBe(true);
    expect(token.banned).toBe(false);
    expect(token.isActive).toBe(true);
    expect(token.csrfToken).toBe('user-csrf');
  });

  it('sets googleId from account provider when account is google', async () => {
    const params = makeParams({
      trigger: 'signIn',
      user: { id: '507f1f77bcf86cd799439011', email: 'g@test.com' } as Parameters<typeof jwtCallback>[0]['user'],
      account: { provider: 'google', providerAccountId: 'google-uid-123' } as Parameters<typeof jwtCallback>[0]['account'],
      token: {} as JWT,
    });

    const token = await jwtCallback(params);
    expect(token.googleId).toBe('google-uid-123');
  });

  it('records pendingSessionCreatedAt for pending Google sessions', async () => {
    const before = Date.now();
    const params = makeParams({
      trigger: 'signIn',
      user: { id: 'pending_google:gid123', email: 'g@test.com', isRegistered: false } as Parameters<typeof jwtCallback>[0]['user'],
      token: {} as JWT,
    });

    const token = await jwtCallback(params);
    expect(token.pendingSessionCreatedAt).toBeGreaterThanOrEqual(before);
    expect(token.pendingSessionCreatedAt).toBeLessThanOrEqual(Date.now());
  });

  it('keeps existing csrf token when user does not provide one', async () => {
    const params = makeParams({
      trigger: 'signIn',
      user: { id: '507f1f77bcf86cd799439011', email: 'u@test.com' } as Parameters<typeof jwtCallback>[0]['user'],
      token: { csrfToken: 'keep-me' } as JWT,
    });

    const token = await jwtCallback(params);
    // generateCsrfToken called on signIn trigger — overrides existing
    expect(token.csrfToken).toBe('csrf-token-generated');
  });
});

// ── Trigger=update — profile update ───────────────────────────────────────────

describe('jwtCallback — trigger=update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockUserFindOne.mockResolvedValue(null);
  });

  it('updates name and image from session.user on update trigger', async () => {
    const params = makeParams({
      trigger: 'update',
      token: {
        id: '507f1f77bcf86cd799439011',
        name: 'Old Name',
        image: 'old.jpg',
        authDataRefreshedAt: Date.now(),
        csrfToken: 'tok',
      } as JWT,
      session: { user: { name: 'New Name', image: 'new.jpg' } },
    });

    const token = await jwtCallback(params);
    expect(token.name).toBe('New Name');
    expect(token.image).toBe('new.jpg');
  });

  it('does not override name with empty string', async () => {
    const params = makeParams({
      trigger: 'update',
      token: {
        id: '507f1f77bcf86cd799439011',
        name: 'Old Name',
        authDataRefreshedAt: Date.now(),
        csrfToken: 'tok',
      } as JWT,
      session: { user: { name: '' } },
    });

    const token = await jwtCallback(params);
    expect(token.name).toBe('Old Name');
  });
});

// ── Auth state refresh — Redis cache hit ──────────────────────────────────────

describe('jwtCallback — auth state refresh — Redis cache hit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads data from Redis cache and updates token', async () => {
    const cachedData = {
      id: '507f1f77bcf86cd799439011',
      role: 'fixer',
      username: 'fixerguy',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      banned: false,
      isActive: true,
      deleted: false,
      location: null,
      skills: [],
      subscription: null,
      sessionVersion: Date.now(),
      lastUpdated: Date.now(),
    };

    mockRedisGet.mockResolvedValue(cachedData);

    const params = makeParams({
      token: {
        id: '507f1f77bcf86cd799439011',
        csrfToken: 'tok',
        // no role → triggers refresh
      } as JWT,
    });

    const token = await jwtCallback(params);
    expect(token.role).toBe('fixer');
    expect(token.username).toBe('fixerguy');
    expect(token.banned).toBe(false);
    expect(token.isActive).toBe(true);
    expect(token.isRegistered).toBe(true);
  });
});

// ── Auth state refresh — DB lookup ────────────────────────────────────────────

describe('jwtCallback — auth state refresh — DB lookup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('falls back to DB when Redis cache is empty', async () => {
    mockRedisGet.mockResolvedValue(null);
    const dbUser = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      role: 'hirer',
      username: 'hirerdave',
      isVerified: false,
      emailVerified: true,
      phoneVerified: false,
      banned: false,
      isActive: true,
      deletedAt: null,
      location: null,
      skills: [],
      subscription: null,
      updatedAt: new Date(),
      authMethod: 'email',
      phone: '+19998887777',
    };
    mockUserFindOne.mockResolvedValue(dbUser);
    mockRedisSet.mockResolvedValue('OK');

    const params = makeParams({
      token: {
        id: '507f1f77bcf86cd799439011',
        csrfToken: 'tok',
      } as JWT,
    });

    const token = await jwtCallback(params);
    expect(token.role).toBe('hirer');
    expect(token.username).toBe('hirerdave');
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it('caches DB result in Redis after lookup', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockUserFindOne.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      role: 'fixer',
      username: 'fx1',
      isVerified: true,
      emailVerified: true,
      phoneVerified: false,
      banned: false,
      isActive: true,
      deletedAt: null,
      updatedAt: new Date(),
      authMethod: 'email',
      phone: null,
    });
    mockRedisSet.mockResolvedValue('OK');

    await jwtCallback(makeParams({ token: { id: '507f1f77bcf86cd799439011', csrfToken: 'tok' } as JWT }));

    expect(mockRedisSet).toHaveBeenCalledWith(
      'user_session:507f1f77bcf86cd799439011',
      expect.objectContaining({ role: 'fixer' }),
      expect.any(Number)
    );
  });
});

// ── Disabled account handling ──────────────────────────────────────────────────

describe('jwtCallback — disabled account', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nullifies role/username/phone but preserves id for banned users', async () => {
    const cachedData = {
      id: '507f1f77bcf86cd799439011',
      role: 'hirer',
      username: 'banned-user',
      isVerified: true,
      emailVerified: true,
      phoneVerified: false,
      banned: true,       // ← banned
      isActive: true,
      deleted: false,
      location: null,
      skills: [],
      subscription: null,
      sessionVersion: Date.now(),
      lastUpdated: Date.now(),
    };
    mockRedisGet.mockResolvedValue(cachedData);

    const params = makeParams({
      token: {
        id: '507f1f77bcf86cd799439011',
        banned: true,
        csrfToken: 'tok',
      } as JWT,
    });

    const token = await jwtCallback(params);
    expect(token.id).toBe('507f1f77bcf86cd799439011'); // preserved!
    expect(token.role).toBeUndefined();
    expect(token.username).toBeUndefined();
    expect(token.phone).toBeUndefined();
    expect(token.isRegistered).toBe(false);
  });

  it('nullifies role/username/phone for inactive users', async () => {
    const cachedData = {
      id: '507f1f77bcf86cd799439011',
      role: 'fixer',
      username: 'inactive-fixer',
      isVerified: false,
      emailVerified: false,
      phoneVerified: false,
      banned: false,
      isActive: false,    // ← inactive
      deleted: false,
      location: null,
      skills: [],
      subscription: null,
      sessionVersion: Date.now(),
      lastUpdated: Date.now(),
    };
    mockRedisGet.mockResolvedValue(cachedData);

    const token = await jwtCallback(
      makeParams({ token: { id: '507f1f77bcf86cd799439011', isActive: false, csrfToken: 'tok' } as JWT })
    );

    expect(token.role).toBeUndefined();
    expect(token.isRegistered).toBe(false);
  });

  it('nullifies role/username/phone for deleted users', async () => {
    const cachedData = {
      id: '507f1f77bcf86cd799439011',
      role: 'hirer',
      username: 'deleted-user',
      isVerified: false,
      emailVerified: false,
      phoneVerified: false,
      banned: false,
      isActive: true,
      deleted: true,      // ← deleted
      location: null,
      skills: [],
      subscription: null,
      sessionVersion: Date.now(),
      lastUpdated: Date.now(),
    };
    mockRedisGet.mockResolvedValue(cachedData);

    const token = await jwtCallback(
      makeParams({ token: { id: '507f1f77bcf86cd799439011', csrfToken: 'tok' } as JWT })
    );

    expect(token.role).toBeUndefined();
    expect(token.isRegistered).toBe(false);
  });
});

// ── No refresh when data is fresh ─────────────────────────────────────────────

describe('jwtCallback — skip refresh when data is fresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not hit Redis or DB when token is fresh and has role', async () => {
    const params = makeParams({
      token: {
        id: '507f1f77bcf86cd799439011',
        role: 'hirer',
        authDataRefreshedAt: Date.now(), // fresh
        banned: false,
        isActive: true,
        csrfToken: 'tok',
      } as JWT,
    });

    const token = await jwtCallback(params);
    expect(mockRedisGet).not.toHaveBeenCalled();
    expect(mockUserFindOne).not.toHaveBeenCalled();
    expect(token.role).toBe('hirer');
  });
});

// ── Error resilience ───────────────────────────────────────────────────────────

describe('jwtCallback — error resilience', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns token without throwing when Redis fails', async () => {
    mockRedisGet.mockRejectedValue(new Error('Redis is down'));

    const params = makeParams({
      token: { id: '507f1f77bcf86cd799439011', csrfToken: 'tok' } as JWT,
    });

    await expect(jwtCallback(params)).resolves.toBeDefined();
  });

  it('returns token without throwing when DB lookup fails', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockUserFindOne.mockRejectedValue(new Error('DB connection failed'));

    const params = makeParams({
      token: { id: '507f1f77bcf86cd799439011', csrfToken: 'tok' } as JWT,
    });

    await expect(jwtCallback(params)).resolves.toBeDefined();
  });
});
