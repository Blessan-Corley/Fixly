// Phase 2: Updated OTP verification integration coverage for hardened auth/session flows.
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
  },
}));

jest.mock('@/lib/redis', () => ({
  authSlidingRateLimit: jest.fn(),
}));

jest.mock('@/lib/otpService', () => ({
  verifyOTP: jest.fn(),
}));

jest.mock('@/lib/auth-utils', () => ({
  computeIsFullyVerified: jest.fn(
    (emailVerified: boolean, phoneVerified: boolean) =>
      Boolean(emailVerified) && Boolean(phoneVerified)
  ),
  invalidateAuthCache: jest.fn(),
  normalizeEmail: jest.fn((value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : ''
  ),
  normalizeIndianPhone: jest.fn((value: unknown) => {
    if (typeof value !== 'string') return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return null;
  }),
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/auth/verify-otp/route';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { verifyOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import User from '@/models/User';

describe('/api/auth/verify-otp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: true });
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: true,
      message: 'OTP verified successfully',
    });
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 503 when auth OTP rate limiting is degraded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          otp: '123456',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns 429 when auth OTP rate limit is exceeded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: false });

    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          otp: '123456',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many');
  });

  it('returns 400 for invalid JSON bodies', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: '{invalid-json',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid request body');
  });

  it('returns 400 when required OTP fields are missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          otp: '',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Validation failed');
    expect(payload.details?.fieldErrors?.otp).toBeDefined();
  });

  it('returns 400 when no email or phone identifier is provided', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          otp: '123456',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Email or Phone required');
  });

  it('maps temporary OTP backend failures to 503', async () => {
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Verification service temporarily unavailable. Please try again shortly.',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          otp: '123456',
          purpose: 'password_reset',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns success for non-email-verification OTP purposes', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: '9876543210',
          otp: '123456',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(verifyOTP).toHaveBeenCalledWith('+919876543210', '123456', 'signup');
  });

  it('requires authenticated session for email verification OTP purpose', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          otp: '123456',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe('Authentication required');
  });

  it('rejects email verification when request email does not match session email', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'active@example.com',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'different@example.com',
          otp: '123456',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('does not match');
  });

  it('returns 404 when session user is missing in database during email verification', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
      },
    });
    (User.findById as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          otp: '123456',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.message).toBe('User not found');
  });

  it('marks the account verified for email verification OTP success', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      emailVerified: false,
      phoneVerified: true,
      isVerified: false,
      lastActivityAt: undefined,
      save,
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
      },
    });
    (User.findById as jest.Mock).mockResolvedValue(userDoc);

    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'PERSON@example.com',
          otp: '123456',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(userDoc.emailVerified).toBe(true);
    expect(userDoc.isVerified).toBe(true);
    expect(save).toHaveBeenCalled();
    expect(invalidateAuthCache).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('returns 500 when OTP verification throws unexpectedly', async () => {
    (authSlidingRateLimit as jest.Mock).mockRejectedValue(new Error('redis down'));

    const response = await POST(
      new Request('http://localhost/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          otp: '123456',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe('Internal Server Error');
  });
});
