jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/redis', () => ({
  authSlidingRateLimit: jest.fn(),
}));

jest.mock('@/lib/otpService', () => ({
  consumeOTPVerification: jest.fn(),
  verifyOTP: jest.fn(),
}));

jest.mock('@/lib/auth-utils', () => ({
  invalidateAuthCache: jest.fn(),
  normalizeEmail: jest.fn((value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : ''
  ),
}));

import bcrypt from 'bcryptjs';

import { POST } from '@/app/api/auth/reset-password/route';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { consumeOTPVerification, verifyOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import User from '@/models/User';

type ResettableUser = {
  _id: string;
  name: string;
  authMethod: 'email' | 'google';
  googleId?: string;
  banned?: boolean;
  isActive?: boolean;
  deletedAt?: Date;
  passwordHash?: string;
  lastActivityAt?: Date;
  save: jest.Mock;
  addNotification?: jest.Mock;
};

function mockUserLookupResult(user: ResettableUser | null) {
  (User.findOne as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue(user),
  });
}

function buildRequestBody(
  overrides: Partial<{ email: string; newPassword: string; otp: string }> = {}
) {
  return {
    email: 'person@example.com',
    newPassword: 'StrongPass1!',
    otp: '123456',
    ...overrides,
  };
}

describe('/api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: true });
    (consumeOTPVerification as jest.Mock).mockResolvedValue(false);
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: true,
      message: 'OTP verified successfully',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
    (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);
    mockUserLookupResult(null);
  });

  it('returns 503 when reset-password rate limiting is degraded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns 429 when reset-password rate limit is exceeded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({
      success: false,
      degraded: false,
      remaining: 0,
      resetTime: Date.now() + 60 * 60 * 1000,
    });

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many password reset attempts');
    expect(payload.resetTime).toBeUndefined();
    expect(payload.remaining).toBeUndefined();
  });

  it('returns 400 for non-object request body', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(['person@example.com']),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Validation failed');
  });

  it('returns 400 for invalid email', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody({ email: 'invalid-email' })),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('valid email');
  });

  it('returns 400 when otp is not exactly 6 digits', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody({ otp: '1234' })),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('6 digits');
  });

  it('returns 400 for weak passwords', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody({ newPassword: 'weak' })),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(typeof payload.message).toBe('string');
  });

  it('maps temporary OTP verification failures to 503', async () => {
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Verification service temporarily unavailable. Please try again shortly.',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns 404 when no user is found for a verified reset request', async () => {
    mockUserLookupResult(null);

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.message).toBe('User not found');
  });

  it('rejects google-auth accounts from email password reset', async () => {
    mockUserLookupResult({
      _id: '507f1f77bcf86cd799439011',
      name: 'Google User',
      authMethod: 'google',
      googleId: 'google-1',
      save: jest.fn(),
    });

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Google Sign-In');
  });

  it('blocks password resets for banned accounts', async () => {
    mockUserLookupResult({
      _id: '507f1f77bcf86cd799439011',
      name: 'Banned User',
      authMethod: 'email',
      banned: true,
      save: jest.fn(),
    });

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toContain('suspended');
  });

  it('rejects reusing the existing password', async () => {
    const save = jest.fn();
    mockUserLookupResult({
      _id: '507f1f77bcf86cd799439011',
      name: 'Email User',
      authMethod: 'email',
      passwordHash: 'existing-hash',
      save,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('different from your current password');
    expect(save).not.toHaveBeenCalled();
  });

  it('updates password, invalidates auth cache, and returns success', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const addNotification = jest.fn().mockResolvedValue(undefined);
    const userDoc: ResettableUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Email User',
      authMethod: 'email',
      passwordHash: 'existing-hash',
      save,
      addNotification,
    };
    mockUserLookupResult(userDoc);

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(buildRequestBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass1!', 12);
    expect(userDoc.passwordHash).toBe('hashed-new-password');
    expect(save).toHaveBeenCalled();
    expect(invalidateAuthCache).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(addNotification).toHaveBeenCalled();
  });

  it('accepts reset with a consumed password-reset verification receipt without re-verifying OTP', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const addNotification = jest.fn().mockResolvedValue(undefined);
    const userDoc: ResettableUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Email User',
      authMethod: 'email',
      passwordHash: 'existing-hash',
      save,
      addNotification,
    };
    mockUserLookupResult(userDoc);
    (consumeOTPVerification as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          newPassword: 'StrongPass1!',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(verifyOTP).not.toHaveBeenCalled();
  });
});
