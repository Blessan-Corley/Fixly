import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

const mockUserFindById = vi.fn();
vi.mock('@/models/User', () => ({
  default: {
    findById: () => ({
      select: () => ({
        lean: () => mockUserFindById(),
      }),
    }),
  },
}));

import { sessionCallback as _sessionCallback } from '@/lib/auth/callbacks/session';
import type { AdapterUser } from 'next-auth/adapters';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// sessionCallback is typed as optional by NextAuth — assert it's defined
const sessionCallback = _sessionCallback!;

// ── Helpers ────────────────────────────────────────────────────────────────────

// Convenience wrapper — JWT strategy doesn't use `user`, but the union type requires it
async function callSession(session: Session, token: JWT): Promise<Session> {
  return sessionCallback({
    session,
    token,
    user: null as unknown as AdapterUser,
    newSession: undefined,
    trigger: undefined as unknown as 'update',
  }) as Promise<Session>;
}

function makeSession(userOverrides: Partial<Session['user']> = {}): Session {
  return {
    user: {
      id: '507f1f77bcf86cd799439011',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      ...userOverrides,
    },
    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

function makeToken(overrides: Partial<JWT> = {}): JWT {
  return {
    id: '507f1f77bcf86cd799439011',
    role: 'hirer',
    username: 'testuser',
    phone: '+1234567890',
    isVerified: true,
    emailVerified: true,
    phoneVerified: false,
    banned: false,
    isActive: true,
    deleted: false,
    authMethod: 'email',
    needsOnboarding: false,
    isRegistered: true,
    isNewUser: false,
    googleId: undefined,
    csrfToken: 'test-csrf',
    ...overrides,
  } as JWT;
}

// ── Basic field mapping ────────────────────────────────────────────────────────

describe('sessionCallback — basic field mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps all token fields to session.user', async () => {
    const session = makeSession();
    const token = makeToken();

    const result = await callSession(session, token);

    expect(result.user?.id).toBe('507f1f77bcf86cd799439011');
    expect(result.user?.role).toBe('hirer');
    expect(result.user?.username).toBe('testuser');
    expect(result.user?.phone).toBe('+1234567890');
    expect(result.user?.isVerified).toBe(true);
    expect(result.user?.emailVerified).toBe(true);
    expect(result.user?.banned).toBe(false);
    expect(result.user?.isActive).toBe(true);
    expect(result.user?.csrfToken).toBe('test-csrf');
    expect(result.user?.isRegistered).toBe(true);
  });

  it('maps token.picture to session.user.image', async () => {
    const session = makeSession();
    const token = makeToken({ picture: 'https://photo.com/pic.jpg' } as JWT);

    const result = await callSession(session, token);
    expect(result.user?.image).toBe('https://photo.com/pic.jpg');
  });

  it('falls back to token.image when picture is absent', async () => {
    const session = makeSession({ image: '' });
    const token = makeToken({ image: 'https://photo.com/img.jpg' } as JWT);

    const result = await callSession(session, token);
    expect(result.user?.image).toBe('https://photo.com/img.jpg');
  });

  it('returns session unchanged when session.user is missing', async () => {
    const session = { expires: new Date().toISOString() } as Session;
    const token = makeToken();

    const result = await callSession(session, token);
    expect(result.user).toBeUndefined();
  });
});

// ── Disabled account — security boundary ──────────────────────────────────────

describe('sessionCallback — disabled account (security boundary)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nullifies id, role, username, phone for banned users', async () => {
    const session = makeSession();
    const token = makeToken({ banned: true });

    const result = await callSession(session, token);

    expect(result.user?.id).toBeUndefined();
    expect(result.user?.role).toBeUndefined();
    expect(result.user?.username).toBeUndefined();
    expect(result.user?.phone).toBeUndefined();
    expect(result.user?.isRegistered).toBe(false);
    expect(result.user?.needsOnboarding).toBe(false);
    expect(result.user?.csrfToken).toBeUndefined();
  });

  it('nullifies id, role, username, phone for inactive users', async () => {
    const session = makeSession();
    const token = makeToken({ isActive: false });

    const result = await callSession(session, token);

    expect(result.user?.id).toBeUndefined();
    expect(result.user?.role).toBeUndefined();
  });

  it('nullifies id, role, username, phone for deleted users', async () => {
    const session = makeSession();
    const token = makeToken({ deleted: true } as JWT);

    const result = await callSession(session, token);

    expect(result.user?.id).toBeUndefined();
    expect(result.user?.role).toBeUndefined();
  });

  it('returns early without hitting DB/Redis for disabled accounts', async () => {
    const session = makeSession();
    const token = makeToken({ banned: true });

    await callSession(session, token);

    expect(mockRedisGet).not.toHaveBeenCalled();
    expect(mockUserFindById).not.toHaveBeenCalled();
  });
});

// ── Pending Google signup passthrough ─────────────────────────────────────────

describe('sessionCallback — pending Google signup (not yet registered)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns session early for unregistered user without valid ObjectId', async () => {
    const session = makeSession();
    const token = makeToken({
      id: 'pending_google:gid123',
      isRegistered: false,
      needsOnboarding: true,
      role: undefined,
    } as JWT);

    const result = await callSession(session, token);

    expect(mockRedisGet).not.toHaveBeenCalled();
    expect(result.user?.isRegistered).toBe(false);
  });
});

// ── Role fallback — Redis cache hit ───────────────────────────────────────────

describe('sessionCallback — role fallback — Redis cache', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads role from Redis when token has no role but valid ObjectId', async () => {
    const cachedUser = {
      id: '507f1f77bcf86cd799439011',
      role: 'fixer',
      emailVerified: true,
      phoneVerified: true,
      isVerified: true,
      banned: false,
      isActive: true,
      deleted: false,
    };
    mockRedisGet.mockResolvedValue(cachedUser);

    const session = makeSession();
    const token = makeToken({ role: undefined });

    const result = await callSession(session, token);

    expect(result.user?.role).toBe('fixer');
    expect(mockUserFindById).not.toHaveBeenCalled();
  });
});

// ── Role fallback — DB lookup ──────────────────────────────────────────────────

describe('sessionCallback — role fallback — DB lookup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads role from DB when Redis has no data', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockUserFindById.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      role: 'admin',
      emailVerified: true,
      phoneVerified: false,
      isVerified: true,
      banned: false,
      isActive: true,
      deletedAt: null,
    });
    mockRedisSet.mockResolvedValue('OK');

    const session = makeSession();
    const token = makeToken({ role: undefined });

    const result = await callSession(session, token);

    expect(result.user?.role).toBe('admin');
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it('caches DB result in Redis after lookup', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockUserFindById.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      role: 'hirer',
      emailVerified: false,
      phoneVerified: false,
      isVerified: false,
      banned: false,
      isActive: true,
      deletedAt: null,
    });
    mockRedisSet.mockResolvedValue('OK');

    await callSession(makeSession(), makeToken({ role: undefined }));

    expect(mockRedisSet).toHaveBeenCalledWith(
      'user_data:507f1f77bcf86cd799439011',
      expect.objectContaining({ role: 'hirer' }),
      expect.any(Number)
    );
  });

  it('nullifies id for disabled user found in DB lookup', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockUserFindById.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      role: 'fixer',
      emailVerified: false,
      phoneVerified: false,
      isVerified: false,
      banned: true,    // ← found banned
      isActive: true,
      deletedAt: null,
    });
    mockRedisSet.mockResolvedValue('OK');

    const result = await callSession(makeSession(), makeToken({ role: undefined }));

    expect(result.user?.id).toBeUndefined();
    expect(result.user?.role).toBeUndefined();
  });

  it('does not crash when DB returns null user', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockUserFindById.mockResolvedValue(null);

    const result = await callSession(makeSession(), makeToken({ role: undefined }));

    expect(result.user?.role).toBeUndefined();
  });

  it('does not crash on DB error', async () => {
    mockRedisGet.mockResolvedValue(null);
    mockUserFindById.mockRejectedValue(new Error('DB failure'));

    const result = await callSession(makeSession(), makeToken({ role: undefined }));

    expect(result).toBeDefined();
  });
});

// ── No role fallback when role present ────────────────────────────────────────

describe('sessionCallback — no role fallback needed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not hit Redis or DB when role is already in token', async () => {
    const session = makeSession();
    const token = makeToken({ role: 'hirer' });

    const result = await callSession(session, token);

    expect(mockRedisGet).not.toHaveBeenCalled();
    expect(mockUserFindById).not.toHaveBeenCalled();
    expect(result.user?.role).toBe('hirer');
  });
});
