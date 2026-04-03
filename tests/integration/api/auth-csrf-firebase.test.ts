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

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/firebase-admin', () => ({
  __esModule: true,
  default: {
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
  },
}));

jest.mock('@/lib/auth-utils', () => ({
  buildPhoneLookupValues: jest.fn((phone: string) => [phone]),
  computeIsFullyVerified: jest.fn((emailVerified: boolean, phoneVerified: boolean) => emailVerified && phoneVerified),
  invalidateAuthCache: jest.fn(),
  normalizeIndianPhone: jest.fn((phone: string | undefined) => phone || null),
}));

jest.mock('@/lib/security/csrf.server', () => ({
  getCsrfToken: jest.fn(),
  generateCsrfToken: jest.fn(),
  validateCsrfToken: jest.fn(),
}));

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    apiSuccess: jest.fn().mockImplementation((data: unknown) => {
      const { NextResponse } = jest.requireActual('next/server');
      return NextResponse.json({ success: true, data }, { status: 200 });
    }),
  };
});

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { GET as getCsrfToken } from '@/app/api/auth/csrf-token/route';
import { POST as verifyPhoneFirebase } from '@/app/api/auth/verify-phone-firebase/route';
import { invalidateAuthCache } from '@/lib/auth-utils';
import firebaseAdmin from '@/lib/firebase-admin';
import { getCsrfToken as getCsrfFromSession } from '@/lib/security/csrf.server';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF = 'test-csrf-token-for-integration-tests';
const USER_ID = 'test-user-id';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: { id: USER_ID, email: 'test@example.com', role, csrfToken: TEST_CSRF },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/auth/verify-phone-firebase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/auth/csrf-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await getCsrfToken();
    expect(response.status).toBe(401);
  });

  it('returns 500 when CSRF token cannot be generated from session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (getCsrfFromSession as jest.Mock).mockReturnValue(null);

    const response = await getCsrfToken();
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error).toBe('CSRF token unavailable');
  });

  it('returns 200 with a CSRF token when authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (getCsrfFromSession as jest.Mock).mockReturnValue('generated-csrf-token-64-chars');

    const response = await getCsrfToken();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.csrfToken).toBe('generated-csrf-token-64-chars');
  });
});

describe('/api/auth/verify-phone-firebase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, resetTime: Date.now() + 60_000 });

    const response = await verifyPhoneFirebase(makeRequest({ idToken: 'some-token' }));
    expect(response.status).toBe(429);
  });

  it('returns 503 when rate limiter is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await verifyPhoneFirebase(makeRequest({ idToken: 'some-token' }));
    expect(response.status).toBe(503);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await verifyPhoneFirebase(makeRequest({ idToken: 'some-token' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 when idToken is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

    const response = await verifyPhoneFirebase(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it('returns 404 when user not found in DB', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue(null);

    const response = await verifyPhoneFirebase(makeRequest({ idToken: 'valid-firebase-token' }));
    expect(response.status).toBe(404);
  });

  it('returns 400 when user phone is already verified', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue({
      _id: USER_ID,
      phoneVerified: true,
      banned: false,
      isActive: true,
      deletedAt: null,
    });

    const response = await verifyPhoneFirebase(makeRequest({ idToken: 'valid-firebase-token' }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.message).toContain('already verified');
  });

  it('returns 403 when user account is banned', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue({
      _id: USER_ID,
      phoneVerified: false,
      banned: true,
      isActive: true,
      deletedAt: null,
    });

    const response = await verifyPhoneFirebase(makeRequest({ idToken: 'valid-firebase-token' }));
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.message).toBe('Account is suspended');
  });

  it('returns 401 when Firebase token is invalid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue({
      _id: USER_ID,
      phoneVerified: false,
      banned: false,
      isActive: true,
      deletedAt: null,
    });
    (firebaseAdmin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('Invalid token')),
    });

    const response = await verifyPhoneFirebase(makeRequest({ idToken: 'invalid-token' }));
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.message).toContain('Invalid or expired');
  });

  it('returns 409 when phone number is already in use by another account', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.findById as jest.Mock).mockResolvedValue({
      _id: USER_ID,
      phoneVerified: false,
      banned: false,
      isActive: true,
      deletedAt: null,
    });
    (firebaseAdmin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'firebase-uid',
        phone_number: '+919876543210',
      }),
    });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'another-user-id' }),
      }),
    });

    const response = await verifyPhoneFirebase(
      makeRequest({ idToken: 'valid-firebase-token', phoneNumber: '+919876543210' })
    );
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.message).toContain('already in use');
  });

  it('returns 200 when phone is verified successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockUser = {
      _id: USER_ID,
      phoneVerified: false,
      emailVerified: false,
      banned: false,
      isActive: true,
      deletedAt: null,
      providers: [],
      phone: null,
      isVerified: false,
      authMethod: 'google',
      addNotification: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);
    (firebaseAdmin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'firebase-uid',
        phone_number: '+919876543210',
      }),
    });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);

    const response = await verifyPhoneFirebase(
      makeRequest({ idToken: 'valid-firebase-token', phoneNumber: '+919876543210' })
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.phoneVerified).toBe(true);
    expect(mockUser.save).toHaveBeenCalled();
    expect(invalidateAuthCache).toHaveBeenCalledWith(USER_ID);
  });
});
