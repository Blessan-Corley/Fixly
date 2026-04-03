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
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/auth-utils', () => ({
  buildPhoneLookupValues: jest.fn(() => ['+919876543210', '9876543210', '919876543210']),
  computeIsFullyVerified: jest.fn(
    (emailVerified: boolean, phoneVerified: boolean) =>
      Boolean(emailVerified) && Boolean(phoneVerified)
  ),
  invalidateAuthCache: jest.fn(),
  normalizeIndianPhone: jest.fn((value: unknown) => {
    if (typeof value !== 'string') return null;
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 ? `+91${digits}` : null;
  }),
}));

import { getServerSession } from 'next-auth/next';

import { PUT } from '@/app/api/user/update-phone/route';
import { invalidateAuthCache } from '@/lib/auth-utils';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/update-phone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011', csrfToken: TEST_CSRF_TOKEN },
    });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
    (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 503 when update-phone rate limiting is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await PUT(
      new Request('http://localhost/api/user/update-phone', {
        method: 'PUT',
        body: JSON.stringify({ phoneNumber: '9876543210' }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('rejects duplicate phone numbers', async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'another-user' }),
      }),
    });

    const response = await PUT(
      new Request('http://localhost/api/user/update-phone', {
        method: 'PUT',
        body: JSON.stringify({ phoneNumber: '9876543210' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('already registered');
  });

  it('updates phone and resets verification state', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const addNotification = jest.fn().mockResolvedValue(undefined);
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      emailVerified: true,
      phone: '+919912345678',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      isVerified: true,
      save,
      addNotification,
    };
    (User.findById as jest.Mock).mockResolvedValue(userDoc);

    const response = await PUT(
      new Request('http://localhost/api/user/update-phone', {
        method: 'PUT',
        body: JSON.stringify({ phoneNumber: '9876543210' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(userDoc.phone).toBe('+919876543210');
    expect(userDoc.phoneVerified).toBe(false);
    expect(save).toHaveBeenCalled();
    expect(invalidateAuthCache).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
