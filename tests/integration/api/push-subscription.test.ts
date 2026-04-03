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

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { DELETE, GET, POST } from '@/app/api/user/push-subscription/route';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/push-subscription', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: userId,
        csrfToken: TEST_CSRF_TOKEN,
      },
    });
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY = 'test-public-key';
  });

  it('rejects invalid subscription payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/push-subscription', {
        method: 'POST',
        headers: [['x-csrf-token', TEST_CSRF_TOKEN]],
        body: JSON.stringify({ subscription: { endpoint: '' } }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('VALIDATION_ERROR');
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('saves a valid subscription with subscription metadata', async () => {
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: userId });

    const response = await POST(
      new Request('http://localhost/api/user/push-subscription', {
        method: 'POST',
        headers: [
          ['user-agent', 'jest-test-agent'],
          ['x-csrf-token', TEST_CSRF_TOKEN],
        ],
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://push.example.test/subscription-id',
            expirationTime: null,
            keys: {
              auth: 'auth-token',
              p256dh: 'p256dh-token',
            },
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data?.message).toBe('Push subscription saved successfully');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        pushSubscription: expect.objectContaining({
          endpoint: 'https://push.example.test/subscription-id',
          userAgent: 'jest-test-agent',
        }),
      }),
      { new: true }
    );
  });

  it('returns subscription status and public key', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          pushSubscription: {
            endpoint: 'https://push.example.test/subscription-id',
            keys: {
              auth: 'auth-token',
              p256dh: 'p256dh-token',
            },
          },
        }),
      }),
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data?.subscribed).toBe(true);
    expect(typeof payload.data?.publicKey).toBe('string');
    expect(payload.data?.publicKey).toBeTruthy();
  });

  it('removes an existing subscription', async () => {
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: userId });

    const response = await DELETE(
      new Request('http://localhost/api/user/push-subscription', {
        method: 'DELETE',
        headers: [['x-csrf-token', TEST_CSRF_TOKEN]],
      })
    );

    expect(response.status).toBe(204);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      { $unset: { pushSubscription: 1 } },
      { new: true }
    );
  });
});
