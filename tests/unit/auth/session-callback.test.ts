import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { sessionCallback as _sessionCallback } from '@/lib/auth/callbacks/session';

import type { AdapterUser } from 'next-auth/adapters';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

// sessionCallback is typed as optional by NextAuth — assert it's defined
const sessionCallback = _sessionCallback!;

// ── Helpers ────────────────────────────────────────────────────────────────────

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

  it('returns early for disabled accounts without hitting the token fields', async () => {
    const session = makeSession();
    const token = makeToken({ banned: true });

    const result = await callSession(session, token);

    // Verify the early return path: registration and onboarding flags are cleared
    expect(result.user?.isRegistered).toBe(false);
    expect(result.user?.needsOnboarding).toBe(false);
  });
});

// ── Pending Google signup passthrough ─────────────────────────────────────────

describe('sessionCallback — pending Google signup (not yet registered)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns session with isRegistered false for pending Google token', async () => {
    const session = makeSession();
    const token = makeToken({
      id: 'pending_google:gid123',
      isRegistered: false,
      needsOnboarding: true,
      role: undefined,
    } as JWT);

    const result = await callSession(session, token);

    expect(result.user?.isRegistered).toBe(false);
  });
});

// ── Google ID privacy — never expose raw sub claim ────────────────────────────

describe('sessionCallback — Google ID privacy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets hasGoogleAuth true when token.googleId is present', async () => {
    const session = makeSession();
    const token = makeToken({ googleId: '1234567890' });

    const result = await callSession(session, token);

    expect(result.user?.hasGoogleAuth).toBe(true);
  });

  it('sets hasGoogleAuth false when token.googleId is absent', async () => {
    const session = makeSession();
    const token = makeToken({ googleId: undefined });

    const result = await callSession(session, token);

    expect(result.user?.hasGoogleAuth).toBe(false);
  });

  it('does NOT expose raw googleId on session.user', async () => {
    const session = makeSession();
    const token = makeToken({ googleId: '1234567890' });

    const result = await callSession(session, token);

    expect((result.user as Record<string, unknown>).googleId).toBeUndefined();
  });
});
