// Phase 2: Updated username mutation integration coverage for CSRF-backed session auth.
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

jest.mock('@/lib/otpService', () => ({
  verifyOTP: jest.fn(),
}));

jest.mock('@/lib/auth-utils', () => ({
  invalidateAuthCache: jest.fn(),
  normalizeEmail: jest.fn((value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase() : ''
  ),
}));

jest.mock('@/lib/validations/content-validator', () => ({
  ContentValidator: {
    validateUsername: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { PUT } from '@/app/api/user/update-username/route';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { verifyOTP } from '@/lib/otpService';
import { ContentValidator } from '@/lib/validations/content-validator';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/update-username', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011' },
    });
    (verifyOTP as jest.Mock).mockResolvedValue({ success: true });
    (ContentValidator.validateUsername as jest.Mock).mockResolvedValue({
      isValid: true,
      violations: [],
      suggestions: [],
    });
    (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
  });

  it('returns 503 when username update rate limiting is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await PUT(
      new Request('http://localhost/api/user/update-username', {
        method: 'PUT',
        body: JSON.stringify({
          username: 'better_name',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('returns 429 when username update attempts exceed the limit', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: false });

    const response = await PUT(
      new Request('http://localhost/api/user/update-username', {
        method: 'PUT',
        body: JSON.stringify({
          username: 'better_name',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(429);
  });

  it('rejects invalid usernames before OTP or database lookup', async () => {
    const response = await PUT(
      new Request('http://localhost/api/user/update-username', {
        method: 'PUT',
        body: JSON.stringify({
          username: '##',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error?.message).toBeTruthy();
    expect(verifyOTP).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('rejects usernames blocked by the content validator', async () => {
    (ContentValidator.validateUsername as jest.Mock).mockResolvedValue({
      isValid: false,
      violations: [{ message: 'Username contains prohibited content' }],
      suggestions: ['Try a neutral username'],
    });

    const response = await PUT(
      new Request('http://localhost/api/user/update-username', {
        method: 'PUT',
        body: JSON.stringify({
          username: 'abusive_name',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error?.message).toContain('prohibited');
    expect(verifyOTP).not.toHaveBeenCalled();
  });

  it('maps temporary OTP verification failures to 503', async () => {
    (verifyOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Verification service temporarily unavailable. Please try again shortly.',
    });

    const response = await PUT(
      new Request('http://localhost/api/user/update-username', {
        method: 'PUT',
        body: JSON.stringify({
          username: 'better_name',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('rejects when the username is already taken', async () => {
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      username: 'current_name',
      usernameChangeCount: 0,
    };
    (User.findById as jest.Mock).mockResolvedValue(userDoc);
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'existing-user' }),
      }),
    });

    const response = await PUT(
      new Request('http://localhost/api/user/update-username', {
        method: 'PUT',
        body: JSON.stringify({
          username: 'taken_name',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('updates username successfully and invalidates auth cache', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const addNotification = jest.fn().mockResolvedValue(undefined);
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      username: 'current_name',
      usernameChangeCount: 1,
      save,
      addNotification,
    };
    (User.findById as jest.Mock).mockResolvedValue(userDoc);

    const response = await PUT(
      new Request('http://localhost/api/user/update-username', {
        method: 'PUT',
        body: JSON.stringify({
          username: 'better_name',
          otp: '123456',
          email: 'person@example.com',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(userDoc.username).toBe('better_name');
    expect(userDoc.usernameChangeCount).toBe(2);
    expect(save).toHaveBeenCalled();
    expect(invalidateAuthCache).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(addNotification).toHaveBeenCalled();
  });
});
