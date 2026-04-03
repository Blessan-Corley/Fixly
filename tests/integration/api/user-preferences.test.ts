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
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    setex: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(0),
  },
}));

import { getServerSession } from 'next-auth/next';

import { PUT as putPreferences } from '@/app/api/user/preferences/route';
import {
  GET as getNotificationPreferences,
  POST as postNotificationPreferences,
} from '@/app/api/user/notification-preferences/route';
import User from '@/models/User';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

// Both preferences routes call `request.clone().body` when constructing a NextRequest
// for parseBody. The global Request polyfill in jest.setup.js does not implement clone(),
// so we add it to the prototype here.
beforeAll(() => {
  const OrigProto = Object.getPrototypeOf(new Request('http://localhost'));
  if (OrigProto && !OrigProto.clone) {
    OrigProto.clone = function (this: Request) {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: (this as unknown as { body: BodyInit }).body,
      });
    };
  }
});

// Helper that builds a session with a custom CSRF token that won't match the
// auto-attached TEST_CSRF_TOKEN, triggering a real 403.
function sessionWithMismatchedCsrf(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: {
      id: `test-user-${role}-id`,
      email: `test-${role}@example.com`,
      role,
      csrfToken: 'a'.repeat(64),
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

describe('/api/user/preferences', () => {
  const userId = 'test-user-hirer-id';

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await putPreferences(
      new Request('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify({ preferences: { theme: 'dark' } }),
      })
    );
    expect(response.status).toBe(401);
  });

  it('returns 403 for CSRF failure on PUT', async () => {
    // Session has a token that won't match the auto-attached TEST_CSRF_TOKEN
    (getServerSession as jest.Mock).mockResolvedValue(sessionWithMismatchedCsrf('hirer'));

    const response = await putPreferences(
      new Request('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: { theme: 'dark' } }),
      })
    );
    expect(response.status).toBe(403);
  });

  it('returns 400 when preferences field is missing', async () => {
    const response = await putPreferences(
      new Request('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify({ notifications: { emailEnabled: true } }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message ?? payload.error).toBeTruthy();
  });

  it('updates preferences with valid data', async () => {
    const updatedUser = { _id: userId, preferences: { theme: 'dark' } };
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedUser);

    const response = await putPreferences(
      new Request('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify({ preferences: { theme: 'dark' } }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect((payload.data?.message ?? payload.message)).toContain('success');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      { preferences: { theme: 'dark' } },
      { new: true }
    );
  });
});

describe('/api/user/notification-preferences', () => {
  const userId = 'test-user-hirer-id';

  const makeUserDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: userId,
    preferences: { browserNotifications: false },
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
  });

  // --- GET ---

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await getNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences')
      );
      expect(response.status).toBe(401);
    });

    it('returns notification preferences for authenticated user', async () => {
      const userDoc = makeUserDoc({ preferences: { browserNotifications: true } });
      // notification-preferences GET calls User.findById(userId).select('preferences')
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(userDoc),
      });

      const response = await getNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences')
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      const prefs = payload.data?.preferences ?? payload.preferences;
      expect(prefs).toBeDefined();
      expect(prefs.browserNotifications).toBe(true);
    });

    it('returns 404 when user not found', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const response = await getNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences')
      );
      expect(response.status).toBe(404);
    });
  });

  // --- POST ---

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await postNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ browserNotifications: true }),
        })
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 for CSRF failure', async () => {
      // Session has a token that won't match the auto-attached TEST_CSRF_TOKEN
      (getServerSession as jest.Mock).mockResolvedValue(sessionWithMismatchedCsrf('hirer'));

      const response = await postNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ browserNotifications: true }),
        })
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 when browserNotifications is not a boolean', async () => {
      const userDoc = makeUserDoc();
      (User.findById as jest.Mock).mockResolvedValue(userDoc);

      const response = await postNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ browserNotifications: 'yes' }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toBeTruthy();
    });

    it('updates notification preferences with valid data', async () => {
      const userDoc = makeUserDoc();
      (User.findById as jest.Mock).mockResolvedValue(userDoc);

      const response = await postNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ browserNotifications: true }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data?.message ?? payload.message).toContain('updated');
      expect(userDoc.preferences.browserNotifications).toBe(true);
      expect(userDoc.save).toHaveBeenCalled();
    });

    it('returns 404 when user not found on POST', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      const response = await postNotificationPreferences(
        new Request('http://localhost/api/user/notification-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ browserNotifications: false }),
        })
      );
      expect(response.status).toBe(404);
    });
  });
});
