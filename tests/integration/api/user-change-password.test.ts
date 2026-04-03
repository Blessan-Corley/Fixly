jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

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
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/otpService', () => ({
  verifyOTP: jest.fn(),
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/auth-utils', () => ({
  invalidateAuthCache: jest.fn(),
  normalizeEmail: jest.fn((value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : ''
  ),
}));

import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';

import { PUT } from '@/app/api/user/change-password/route';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { verifyOTP } from '@/lib/otpService';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/change-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011' },
    });
    (verifyOTP as jest.Mock).mockResolvedValue({ success: true });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 503 when change-password rate limiting is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await PUT(
      new Request('http://localhost/api/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          newPassword: 'StrongPass1!',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('rejects weak passwords', async () => {
    const response = await PUT(
      new Request('http://localhost/api/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          newPassword: 'weak',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('maps temporary OTP verification failures to 503', async () => {
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Verification service temporarily unavailable. Please try again shortly.',
    });

    const response = await PUT(
      new Request('http://localhost/api/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          newPassword: 'StrongPass1!',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('rejects google-auth accounts', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
        authMethod: 'google',
        googleId: 'google-1',
      }),
    });

    const response = await PUT(
      new Request('http://localhost/api/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          newPassword: 'StrongPass1!',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('rejects reusing the current password', async () => {
    const save = jest.fn();
    const addNotification = jest.fn();
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
        authMethod: 'email',
        passwordHash: 'existing',
        save,
        addNotification,
      }),
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const response = await PUT(
      new Request('http://localhost/api/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          newPassword: 'StrongPass1!',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('changes password successfully and invalidates auth cache', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const addNotification = jest.fn().mockResolvedValue(undefined);
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      email: 'person@example.com',
      authMethod: 'email',
      googleId: undefined,
      passwordHash: 'existing',
      save,
      addNotification,
    };
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(userDoc),
    });

    const response = await PUT(
      new Request('http://localhost/api/user/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          newPassword: 'StrongPass1!',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(userDoc.passwordHash).toBe('hashed-password');
    expect(save).toHaveBeenCalled();
    expect(invalidateAuthCache).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(addNotification).toHaveBeenCalled();
  });
});
