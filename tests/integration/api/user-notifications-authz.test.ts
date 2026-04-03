jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/validations/content-policy', () => ({
  moderateUserGeneratedContent: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    exists: jest.fn(),
  },
}));

jest.mock('@/lib/services/notifications', () => ({
  getNotificationService: jest.fn().mockImplementation(async () => ({
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  })),
  NOTIFICATION_CATEGORIES: {
    SYSTEM: 'system',
  },
  NOTIFICATION_TYPES: {
    ACCOUNT_UPDATE: 'account_update',
    PAYMENT_FAILED: 'payment_failed',
    APPLICATION_ACCEPTED: 'application_accepted',
    JOB_APPLICATION: 'job_application',
    NEW_MESSAGE: 'new_message',
  },
  NOTIFICATION_PRIORITY: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
  },
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    invalidatePattern: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/lib/ably', () => ({
  CHANNELS: {
    userNotifications: jest.fn(),
  },
  EVENTS: {},
  getServerAbly: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/user/notifications/route';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/notifications POST authz', () => {
  const userId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({ allowed: true });
    (User.exists as jest.Mock).mockResolvedValue(true);
  });

  it('allows authenticated users to create notifications for themselves', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: userId, role: 'hirer', csrfToken: TEST_CSRF_TOKEN },
    });

    const response = await POST(
      new Request('http://localhost/api/user/notifications', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': TEST_CSRF_TOKEN,
        },
        body: JSON.stringify({
          targetUserId: userId,
          type: 'message',
          title: 'Hello',
          message: 'Own notification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
  });

  it('blocks authenticated users from creating notifications for another user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: userId, role: 'hirer', csrfToken: TEST_CSRF_TOKEN },
    });

    const response = await POST(
      new Request('http://localhost/api/user/notifications', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': TEST_CSRF_TOKEN,
        },
        body: JSON.stringify({
          targetUserId: otherUserId,
          type: 'message',
          title: 'Hello',
          message: 'Unauthorized target',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('Cannot create notifications for other users');
    expect(payload.message).toBe('Cannot create notifications for other users');
    expect(User.exists).not.toHaveBeenCalled();
  });

  it('allows admin users to create notifications for any user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: userId, role: 'admin', csrfToken: TEST_CSRF_TOKEN },
    });

    const response = await POST(
      new Request('http://localhost/api/user/notifications', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': TEST_CSRF_TOKEN,
        },
        body: JSON.stringify({
          targetUserId: otherUserId,
          type: 'message',
          title: 'Hello',
          message: 'Admin target',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
  });

  it('returns 401 for unauthenticated requests', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/user/notifications', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: otherUserId,
          type: 'message',
          title: 'Hello',
          message: 'No auth',
        }),
      })
    );

    expect(response.status).toBe(401);
  });
});
