jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/services/auth/emailChangeService', () => ({
  sendEmailChangeOtpForUser: jest.fn(),
  verifyAndApplyEmailChangeForUser: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/user/change-email/route';
import {
  sendEmailChangeOtpForUser,
  verifyAndApplyEmailChangeForUser,
} from '@/services/auth/emailChangeService';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/change-email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011', csrfToken: TEST_CSRF_TOKEN },
    });
    (sendEmailChangeOtpForUser as jest.Mock).mockResolvedValue({
      success: true,
      status: 200,
      message: 'Verification code sent',
      expiresAt: new Date().toISOString(),
    });
    (verifyAndApplyEmailChangeForUser as jest.Mock).mockResolvedValue({
      success: true,
      status: 200,
      message: 'Email changed',
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'new@example.com',
        emailVerified: true,
        isVerified: true,
      },
    });
  });

  it('returns 503 when change-email rate limiting is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(
      new Request('http://localhost/api/user/change-email', {
        method: 'POST',
        body: JSON.stringify({
          step: 'send_otp',
          newEmail: 'new@example.com',
        }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('sends OTP using shared email-change service', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/change-email', {
        method: 'POST',
        body: JSON.stringify({
          step: 'send_otp',
          newEmail: 'new@example.com',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(sendEmailChangeOtpForUser).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'new@example.com'
    );
  });

  it('verifies and applies email change using shared service', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/change-email', {
        method: 'POST',
        body: JSON.stringify({
          step: 'verify_and_change',
          newEmail: 'new@example.com',
          otp: '123456',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(verifyAndApplyEmailChangeForUser).toHaveBeenCalledWith({
      userId: '507f1f77bcf86cd799439011',
      rawNewEmail: 'new@example.com',
      rawOtp: '123456',
    });
  });

  it('rejects invalid step values', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/change-email', {
        method: 'POST',
        body: JSON.stringify({
          step: 'unknown_step',
          newEmail: 'new@example.com',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Validation failed');
    expect(payload.details?.fieldErrors?.step).toBeDefined();
  });
});
