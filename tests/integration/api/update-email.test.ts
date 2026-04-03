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
  verifyAndApplyEmailChangeForUser: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { PUT } from '@/app/api/user/update-email/route';
import { verifyAndApplyEmailChangeForUser } from '@/services/auth/emailChangeService';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/update-email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011' },
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

  it('returns 503 when update-email rate limiting is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await PUT(
      new Request('http://localhost/api/user/update-email', {
        method: 'PUT',
        body: JSON.stringify({
          email: 'new@example.com',
          otp: '123456',
          currentEmail: 'old@example.com',
        }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('requires email, otp, and current email fields', async () => {
    const response = await PUT(
      new Request('http://localhost/api/user/update-email', {
        method: 'PUT',
        body: JSON.stringify({
          email: 'new@example.com',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(verifyAndApplyEmailChangeForUser).not.toHaveBeenCalled();
  });

  it('delegates to shared email-change service for update flow', async () => {
    const response = await PUT(
      new Request('http://localhost/api/user/update-email', {
        method: 'PUT',
        body: JSON.stringify({
          email: 'new@example.com',
          otp: '123456',
          currentEmail: 'old@example.com',
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
      rawCurrentEmail: 'old@example.com',
    });
  });
});
