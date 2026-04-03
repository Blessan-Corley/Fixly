jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/firebase-admin', () => ({
  __esModule: true,
  default: {
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    // findOne is chained: .findOne({}).select('_id').lean() — built per-test
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/auth-utils', () => ({
  buildPhoneLookupValues: jest.fn((phone: string) => [phone]),
  computeIsFullyVerified: jest.fn((emailVerified: boolean, phoneVerified: boolean) => emailVerified && phoneVerified),
  invalidateAuthCache: jest.fn(),
  normalizeIndianPhone: jest.fn((phone: string | undefined) => phone ?? null),
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { getServerSession } from 'next-auth/next';
import firebaseAdmin from '@/lib/firebase-admin';

import { POST } from '@/app/api/auth/verify-phone-firebase/route';
import { computeIsFullyVerified, invalidateAuthCache } from '@/lib/auth-utils';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

// ── Helpers ────────────────────────────────────────────────────────────────────

const SESSION_USER_ID = '507f1f77bcf86cd799439011';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/auth/verify-phone-firebase', {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeUserDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    _id: SESSION_USER_ID,
    email: 'user@example.com',
    emailVerified: true,
    phoneVerified: false,
    banned: false,
    isActive: true,
    deletedAt: null,
    authMethod: 'email',
    providers: [],
    firebaseUid: null,
    lastActivityAt: null,
    phoneVerifiedAt: null,
    isVerified: false,
    addNotification: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return doc;
}

function setupFirebaseVerifyIdToken(result: Record<string, unknown> | 'throw'): void {
  const mockVerifyIdToken = jest.fn();
  if (result === 'throw') {
    mockVerifyIdToken.mockRejectedValue(new Error('Firebase token invalid'));
  } else {
    mockVerifyIdToken.mockResolvedValue(result);
  }
  (firebaseAdmin.auth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerifyIdToken });
}

// ── Setup ──────────────────────────────────────────────────────────────────────

describe('/api/auth/verify-phone-firebase', () => {
  // Helper: sets up User.findOne with chaining support (.select('_id').lean())
  function setupFindOne(result: Record<string, unknown> | null): void {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: SESSION_USER_ID },
    });
    (User.findById as jest.Mock).mockResolvedValue(makeUserDoc());
    setupFindOne(null); // no conflicting phone by default
    (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);
    (computeIsFullyVerified as jest.Mock).mockReturnValue(true);
    setupFirebaseVerifyIdToken({ uid: 'firebase-uid-123', phone_number: '+919876543210' });
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({
      success: false,
      resetTime: Date.now() + 60_000,
    });

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many verification attempts');
  });

  it('returns 503 when rate limiter is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  // ── Authentication ───────────────────────────────────────────────────────────

  it('returns 401 when no session exists', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
  });

  it('returns 401 when session has no user id', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: {} });

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
  });

  // ── Input validation ─────────────────────────────────────────────────────────

  it('returns 400 when idToken is missing', async () => {
    const response = await POST(makeRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(400);
  });

  it('returns 400 when idToken is empty string', async () => {
    const response = await POST(makeRequest({ idToken: '' }));
    const payload = await response.json();

    expect(response.status).toBe(400);
  });

  it('returns 400 on malformed JSON body', async () => {
    const request = new Request('http://localhost/api/auth/verify-phone-firebase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
  });

  // ── DB user lookup ───────────────────────────────────────────────────────────

  it('returns 404 when user is not found in DB', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.message).toBe('User not found');
  });

  // ── Account status checks ────────────────────────────────────────────────────

  it('returns 403 for banned users', async () => {
    (User.findById as jest.Mock).mockResolvedValue(makeUserDoc({ banned: true }));

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toContain('suspended');
  });

  it('returns 403 for inactive users', async () => {
    (User.findById as jest.Mock).mockResolvedValue(makeUserDoc({ isActive: false }));

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(403);
  });

  it('returns 403 for deleted users', async () => {
    (User.findById as jest.Mock).mockResolvedValue(makeUserDoc({ deletedAt: new Date() }));

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(403);
  });

  it('returns 400 when phone is already verified', async () => {
    (User.findById as jest.Mock).mockResolvedValue(makeUserDoc({ phoneVerified: true }));

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('already verified');
  });

  // ── Firebase token verification ──────────────────────────────────────────────

  it('returns 401 when Firebase token is invalid', async () => {
    setupFirebaseVerifyIdToken('throw');

    const response = await POST(makeRequest({ idToken: 'bad-token' }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toContain('Invalid or expired');
  });

  it('returns 400 when Firebase token has no phone number', async () => {
    setupFirebaseVerifyIdToken({ uid: 'firebase-uid-123', phone_number: undefined });

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('phone number');
  });

  // ── Phone number conflicts ───────────────────────────────────────────────────

  it('returns 409 when phone is already in use by another account', async () => {
    setupFindOne({ _id: 'other-user-id' });

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toContain('already in use');
  });

  // ── Phone number mismatch ────────────────────────────────────────────────────

  it('returns 400 when provided phoneNumber does not match decoded token phone', async () => {
    // Firebase decoded: +919876543210 → digits 9876543210
    // Provided: +919999999999 → digits 9999999999
    // normalizeIndianPhone returns the value as-is in our mock, but we need digits to differ
    // Simulate mismatch by providing a different number
    const { normalizeIndianPhone } = jest.requireMock('@/lib/auth-utils') as {
      normalizeIndianPhone: jest.Mock;
    };
    normalizeIndianPhone
      .mockReturnValueOnce('+919876543210') // decoded phone
      .mockReturnValueOnce('+919999999999'); // provided phone

    const response = await POST(
      makeRequest({ idToken: 'valid-token', phoneNumber: '+919999999999' })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('mismatch');
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('returns 200 and marks phone verified on success', async () => {
    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('verified');
    expect(payload.user.phoneVerified).toBe(true);
  });

  it('calls invalidateAuthCache after successful verification', async () => {
    await POST(makeRequest({ idToken: 'valid-token' }));

    expect(invalidateAuthCache).toHaveBeenCalledWith(SESSION_USER_ID);
  });

  it('calls user.save() to persist the verification', async () => {
    const userDoc = makeUserDoc();
    (User.findById as jest.Mock).mockResolvedValue(userDoc);

    await POST(makeRequest({ idToken: 'valid-token' }));

    expect((userDoc as { save: jest.Mock }).save).toHaveBeenCalledTimes(1);
  });

  it('includes isVerified in response computed from emailVerified + phoneVerified', async () => {
    (computeIsFullyVerified as jest.Mock).mockReturnValue(false);
    (User.findById as jest.Mock).mockResolvedValue(
      makeUserDoc({ emailVerified: false, phoneVerified: false })
    );

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(payload.user.isVerified).toBe(false);
  });

  it('allows optional phoneNumber field to be omitted', async () => {
    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it('does not crash when addNotification is not defined on user', async () => {
    const userDoc = makeUserDoc({ addNotification: undefined });
    (User.findById as jest.Mock).mockResolvedValue(userDoc);

    const response = await POST(makeRequest({ idToken: 'valid-token' }));

    expect(response.status).toBe(200);
  });

  it('still returns 200 when addNotification throws', async () => {
    const userDoc = makeUserDoc({
      addNotification: jest.fn().mockRejectedValue(new Error('notification failed')),
    });
    (User.findById as jest.Mock).mockResolvedValue(userDoc);

    const response = await POST(makeRequest({ idToken: 'valid-token' }));

    expect(response.status).toBe(200);
  });

  // ── Unexpected errors ────────────────────────────────────────────────────────

  it('returns 500 on unexpected DB error', async () => {
    (User.findById as jest.Mock).mockRejectedValue(new Error('DB crash'));

    const response = await POST(makeRequest({ idToken: 'valid-token' }));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toContain('failed');
  });
});
