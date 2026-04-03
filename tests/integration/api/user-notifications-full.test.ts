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

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidatePattern: jest.fn(),
  },
}));

jest.mock('@/lib/ably/events', () => ({
  Channels: {
    user: (id: string) => `user:${id}`,
  },
  Events: {
    user: {
      notificationRead: 'notification:read',
      allNotificationsRead: 'notification:read-all',
    },
  },
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn(),
}));

jest.mock('@/lib/services/notifications', () => ({
  getNotificationService: jest.fn(),
  NOTIFICATION_TYPES: {
    SYSTEM: 'system',
    JOB: 'job',
  },
  NotificationService: {
    createNotification: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn(() => null),
  isCsrfExempt: jest.fn(() => false),
  validateCsrfMiddleware: jest.fn(() => null),
}));

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { GET as getNotifPrefs, POST as postNotifPrefs } from '@/app/api/user/notification-preferences/route';
import { POST as markReadPOST } from '@/app/api/user/notifications/read/route';
import { PATCH as markAllReadPATCH } from '@/app/api/user/notifications/read-all/route';
import { csrfGuard } from '@/lib/security/csrf';
import { getNotificationService } from '@/lib/services/notifications';
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

function makeRequest(method: string, body?: unknown, csrfToken = TEST_CSRF): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  return new Request('http://localhost/api/user/notification-preferences', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/user/notification-preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await getNotifPrefs(makeRequest('GET'));
      expect(response.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const response = await getNotifPrefs(makeRequest('GET'));
      expect(response.status).toBe(404);
    });

    it('returns 200 with user notification preferences', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: USER_ID,
          preferences: { browserNotifications: true },
        }),
      });

      const response = await getNotifPrefs(makeRequest('GET'));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.preferences).toBeDefined();
    });

    it('returns 200 with default preferences when user has none', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: USER_ID,
          preferences: null,
        }),
      });

      const response = await getNotifPrefs(makeRequest('GET'));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.preferences).toBeDefined();
    });
  });

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await postNotifPrefs(
        makeRequest('POST', { browserNotifications: true })
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when CSRF token is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (csrfGuard as jest.Mock).mockReturnValueOnce(
        NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
      );

      const response = await postNotifPrefs(
        makeRequest('POST', { browserNotifications: true }, '')
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 when browserNotifications is not a boolean', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await postNotifPrefs(
        makeRequest('POST', { browserNotifications: 'yes' })
      );
      expect(response.status).toBe(400);
    });

    it('returns 404 when user not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockResolvedValue(null);

      const response = await postNotifPrefs(
        makeRequest('POST', { browserNotifications: true })
      );
      expect(response.status).toBe(404);
    });

    it('returns 200 and updates preferences successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      const mockUser = {
        _id: USER_ID,
        preferences: { browserNotifications: false },
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const response = await postNotifPrefs(
        makeRequest('POST', { browserNotifications: true })
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.message).toBe('Notification preferences updated');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});

describe('/api/user/notifications/read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  function makeReadRequest(body?: unknown, csrfToken = TEST_CSRF): Request {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    return new Request('http://localhost/api/user/notifications/read', {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await markReadPOST(makeReadRequest({ notificationId: 'notif-1' }));
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (csrfGuard as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
    );

    const response = await markReadPOST(makeReadRequest({ notificationId: 'notif-1' }, ''));
    expect(response.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

    const response = await markReadPOST(makeReadRequest({ notificationId: 'notif-1' }));
    expect(response.status).toBe(429);
  });

  it('returns 400 when no notification ID or markAll is provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

    const response = await markReadPOST(makeReadRequest({}));
    expect(response.status).toBe(400);
  });

  it('returns 200 when marking a single notification as read', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockNotifService = {
      markAsRead: jest.fn().mockResolvedValue(true),
      getUnreadCount: jest.fn().mockResolvedValue(0),
    };
    (getNotificationService as jest.Mock).mockResolvedValue(mockNotifService);

    const response = await markReadPOST(makeReadRequest({ notificationId: 'notif-1' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.unreadCount).toBe(0);
  });

  it('returns 200 when marking all notifications as read via markAll flag', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockNotifService = {
      markAsRead: jest.fn().mockResolvedValue(true),
      getUnreadCount: jest.fn().mockResolvedValue(0),
    };
    (getNotificationService as jest.Mock).mockResolvedValue(mockNotifService);

    const response = await markReadPOST(makeReadRequest({ markAll: true }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('All notifications marked as read');
  });

  it('returns 200 when marking multiple notifications as read', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockNotifService = {
      markAsRead: jest.fn().mockResolvedValue(true),
      getUnreadCount: jest.fn().mockResolvedValue(2),
    };
    (getNotificationService as jest.Mock).mockResolvedValue(mockNotifService);

    const response = await markReadPOST(
      makeReadRequest({ notificationIds: ['notif-1', 'notif-2'] })
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe('/api/user/notifications/read-all', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeReadAllRequest(csrfToken = TEST_CSRF): Request {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    return new Request('http://localhost/api/user/notifications/read-all', {
      method: 'PATCH',
      headers,
    });
  }

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await markAllReadPATCH(makeReadAllRequest());
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (csrfGuard as jest.Mock).mockReturnValueOnce(
      NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
    );

    const response = await markAllReadPATCH(makeReadAllRequest(''));
    expect(response.status).toBe(403);
  });

  it('returns 200 with no unread count when service returns false (no notifications)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockNotifService = {
      markAsRead: jest.fn().mockResolvedValue(false),
    };
    (getNotificationService as jest.Mock).mockResolvedValue(mockNotifService);

    const response = await markAllReadPATCH(makeReadAllRequest());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.unreadCount).toBe(0);
    expect(body.message).toBe('No unread notifications found');
  });

  it('returns 200 when all notifications are marked as read successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockNotifService = {
      markAsRead: jest.fn().mockResolvedValue(true),
    };
    (getNotificationService as jest.Mock).mockResolvedValue(mockNotifService);

    const response = await markAllReadPATCH(makeReadAllRequest());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.unreadCount).toBe(0);
    expect(body.message).toBe('All notifications marked as read');
  });
});
