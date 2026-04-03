import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const mockConnectDB = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/mongodb', () => ({ default: () => mockConnectDB() }));

// getAuthContextFromCookie relies on next/headers
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const mockGetAuthContextFromCookie = vi.fn<() => Promise<string | null>>();

vi.mock('@/lib/auth/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/utils')>();
  return {
    ...actual,
    getAuthContextFromCookie: () => mockGetAuthContextFromCookie(),
  };
});

const mockComputeIsFullyVerified = vi.fn<(emailVerified: boolean, phoneVerified: boolean) => boolean>(
  (e, p) => e && p
);
vi.mock('@/lib/auth-utils', () => ({
  computeIsFullyVerified: (...args: unknown[]) =>
    mockComputeIsFullyVerified(args[0] as boolean, args[1] as boolean),
}));

const mockUserFindOne = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();

vi.mock('@/models/User', () => ({
  default: {
    findOne: (...args: unknown[]) => mockUserFindOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockUserFindByIdAndUpdate(...args),
  },
}));

import { signInCallback as _signInCallback } from '@/lib/auth/callbacks/signIn';
import type { Account, Profile } from 'next-auth';

// signInCallback is typed as optional by NextAuth — assert it's defined
const signInCallback = _signInCallback!;

// ── Helpers ────────────────────────────────────────────────────────────────────

type SignInParams = Parameters<typeof signInCallback>[0];

function makeGoogleAccount(providerAccountId = 'google-uid-123'): Account {
  return {
    provider: 'google',
    type: 'oauth',
    providerAccountId,
  } as Account;
}

function makeProfile(email = 'user@example.com', name = 'Test User'): Profile {
  return { email, name, sub: 'sub-123' } as Profile;
}

function makeUser(overrides: Record<string, unknown> = {}): SignInParams['user'] {
  return {
    id: 'tmp-id',
    email: 'user@example.com',
    name: 'Test User',
    image: 'https://photo.com/pic.jpg',
    ...overrides,
  } as SignInParams['user'];
}

function makeExistingUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    email: 'user@example.com',
    googleId: 'google-uid-123',
    role: 'hirer',
    username: 'existinguser',
    phone: '+1234567890',
    isVerified: true,
    emailVerified: true,
    phoneVerified: false,
    banned: false,
    isActive: true,
    deletedAt: null,
    authMethod: 'google',
    isRegistered: true,
    ...overrides,
  };
}

// ── Credentials provider passthrough ──────────────────────────────────────────

describe('signInCallback — credentials provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true for any non-google provider', async () => {
    const result = await signInCallback({
      user: makeUser(),
      account: { provider: 'credentials', type: 'credentials', providerAccountId: '' } as Account,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });
    expect(result).toBe(true);
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it('returns true when account is null', async () => {
    const result = await signInCallback({
      user: makeUser(),
      account: null,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });
    expect(result).toBe(true);
  });
});

// ── Google sign-in — existing linked user ────────────────────────────────────

describe('signInCallback — Google — existing linked user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthContextFromCookie.mockResolvedValue('signin');
    mockUserFindOne.mockResolvedValueOnce(makeExistingUser()); // googleId lookup
    mockUserFindOne.mockResolvedValue(null); // email lookup
    mockUserFindByIdAndUpdate.mockResolvedValue(null);
    mockComputeIsFullyVerified.mockReturnValue(true);
  });

  it('returns true for an existing linked Google user', async () => {
    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });
    expect(result).toBe(true);
  });

  it('maps user fields from DB to the user object', async () => {
    const user = makeUser();
    await signInCallback({
      user,
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(user.id).toBe('507f1f77bcf86cd799439011');
    expect(user.role).toBe('hirer');
    expect(user.username).toBe('existinguser');
    expect(user.isRegistered).toBe(true);
  });

  it('updates profile picture and lastLoginAt via findByIdAndUpdate', async () => {
    await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ picture: expect.any(String), lastLoginAt: expect.any(Date) })
    );
  });

  it('marks existing Google user signup attempt as continued sign-in', async () => {
    mockGetAuthContextFromCookie.mockResolvedValue('signup');

    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(true);
  });
});

// ── Google sign-in — banned account ──────────────────────────────────────────

describe('signInCallback — Google — banned account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthContextFromCookie.mockResolvedValue('signin');
    mockUserFindOne.mockResolvedValueOnce(makeExistingUser({ banned: true }));
    mockUserFindOne.mockResolvedValue(null);
  });

  it('redirects to AccountSuspended error for banned users', async () => {
    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('AccountSuspended');
  });
});

// ── Google sign-in — inactive/deleted account ─────────────────────────────────

describe('signInCallback — Google — inactive/deleted account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthContextFromCookie.mockResolvedValue('signin');
    mockUserFindOne.mockResolvedValue(null);
  });

  it('redirects to AccountInactive when isActive=false', async () => {
    mockUserFindOne.mockResolvedValueOnce(makeExistingUser({ isActive: false }));

    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('AccountInactive');
  });

  it('redirects to AccountInactive when deletedAt is set', async () => {
    mockUserFindOne.mockResolvedValueOnce(
      makeExistingUser({ isActive: true, deletedAt: new Date() })
    );

    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('AccountInactive');
  });
});

// ── Google sign-in — email-only account conflicts ─────────────────────────────

describe('signInCallback — Google — email-only account conflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindOne
      .mockResolvedValueOnce(null) // no googleId match
      .mockResolvedValueOnce(makeExistingUser({ googleId: undefined })); // email match
  });

  it('redirects to UseEmailSignIn when authContext=signin and email-only account exists', async () => {
    mockGetAuthContextFromCookie.mockResolvedValue('signin');

    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount('different-google-id'),
      profile: makeProfile('user@example.com'),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('UseEmailSignIn');
    expect(result).toContain(encodeURIComponent('user@example.com'));
  });

  it('redirects to EmailAlreadyRegistered when authContext=signup and email-only account exists', async () => {
    mockGetAuthContextFromCookie.mockResolvedValue('signup');

    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount('different-google-id'),
      profile: makeProfile('user@example.com'),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('EmailAlreadyRegistered');
  });
});

// ── Google sign-in — no account found (signin context) ───────────────────────

describe('signInCallback — Google — signin context, no account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthContextFromCookie.mockResolvedValue('signin');
    mockUserFindOne.mockResolvedValue(null); // no user found at all
  });

  it('redirects to AccountNotFound with email and name', async () => {
    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile('notfound@example.com', 'No One'),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('AccountNotFound');
    expect(result).toContain(encodeURIComponent('notfound@example.com'));
  });
});

// ── Google sign-in — signup context, new user ────────────────────────────────

describe('signInCallback — Google — signup context, new user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthContextFromCookie.mockResolvedValue('signup');
    mockUserFindOne.mockResolvedValue(null);
  });

  it('creates pending Google session for valid new user', async () => {
    const user = makeUser();
    const result = await signInCallback({
      user,
      account: makeGoogleAccount('new-google-id'),
      profile: makeProfile('new@example.com'),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toBe(true);
    expect(user.id).toMatch(/^pending_google:/);
    expect(user.isRegistered).toBe(false);
    expect(user.isNewUser).toBe(true);
    expect(user.googleId).toBe('new-google-id');
    expect(user.emailVerified).toBe(true);
    expect(user.needsOnboarding).toBe(true);
  });

  it('redirects to InvalidEmail for profile without valid email', async () => {
    const result = await signInCallback({
      user: makeUser({ email: null }),
      account: makeGoogleAccount(),
      profile: { sub: 'sub-no-email' } as Profile,
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('InvalidEmail');
  });

  it('redirects to InvalidEmail when email lacks @ symbol', async () => {
    const result = await signInCallback({
      user: makeUser({ email: 'notavalidemail' }),
      account: makeGoogleAccount(),
      profile: { email: 'notavalidemail', sub: 'sub-123' } as Profile,
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('InvalidEmail');
  });
});

// ── Google sign-in — error handling ──────────────────────────────────────────

describe('signInCallback — Google — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthContextFromCookie.mockResolvedValue('signin');
  });

  it('redirects to ServiceUnavailable when an unexpected error occurs', async () => {
    mockUserFindOne.mockRejectedValue(new Error('DB is down'));

    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('ServiceUnavailable');
  });

  it('redirects to ServiceUnavailable when getAuthContextFromCookie throws', async () => {
    mockGetAuthContextFromCookie.mockRejectedValue(new Error('cookie read failure'));

    const result = await signInCallback({
      user: makeUser(),
      account: makeGoogleAccount(),
      profile: makeProfile(),
      email: undefined,
      credentials: undefined,
    });

    expect(result).toContain('ServiceUnavailable');
  });
});
