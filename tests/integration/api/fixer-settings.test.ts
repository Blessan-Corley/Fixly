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

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock('@/lib/validations/content-policy', () => ({
  moderateUserGeneratedContent: jest.fn().mockResolvedValue({ allowed: true }),
}));

import { getServerSession } from 'next-auth/next';

import { GET, PUT } from '@/app/api/user/fixer-settings/route';
import User from '@/models/User';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/fixer-settings', () => {
  const fixerUserId = 'test-user-fixer-id';

  const makeFixerDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: fixerUserId,
    role: 'fixer',
    availableNow: false,
    serviceRadius: 10,
    hourlyRate: 500,
    minimumJobValue: null,
    maximumJobValue: null,
    responseTime: '1',
    workingHours: { start: '09:00', end: '17:00' },
    workingDays: ['monday', 'tuesday'],
    skills: ['plumbing'],
    portfolio: [],
    autoApply: false,
    emergencyAvailable: false,
    save: jest.fn().mockResolvedValue(undefined),
    addNotification: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));
  });

  // --- GET ---

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns fixer settings for authenticated fixer', async () => {
      const userDoc = makeFixerDoc();
      (User.findById as jest.Mock).mockResolvedValue(userDoc);

      const response = await GET();
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.settings).toBeDefined();
      expect(payload.settings.availableNow).toBe(false);
      expect(payload.settings.serviceRadius).toBe(10);
      expect(payload.settings.skills).toEqual(['plumbing']);
    });

    it('returns 403 when hirer tries to access fixer settings', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
      const hirerDoc = makeFixerDoc({ role: 'hirer' });
      (User.findById as jest.Mock).mockResolvedValue(hirerDoc);

      const response = await GET();
      const payload = await response.json();

      expect(response.status).toBe(403);
      expect(payload.message ?? payload.error).toBeTruthy();
    });
  });

  // --- PUT ---

  describe('PUT', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await PUT(
        new Request('http://localhost/api/user/fixer-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ availableNow: true }),
        })
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 for CSRF failure', async () => {
      // Use a session with a custom CSRF token that will NOT match
      // the auto-attached TEST_CSRF_TOKEN from jest.setup.js
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: fixerUserId,
          role: 'fixer',
          csrfToken: 'a'.repeat(64),
        },
        expires: new Date(Date.now() + 86_400_000).toISOString(),
      });
      const userDoc = makeFixerDoc();
      (User.findById as jest.Mock).mockResolvedValue(userDoc);

      const response = await PUT(
        new Request('http://localhost/api/user/fixer-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availableNow: true }),
        })
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid serviceRadius', async () => {
      const userDoc = makeFixerDoc();
      (User.findById as jest.Mock).mockResolvedValue(userDoc);

      const response = await PUT(
        new Request('http://localhost/api/user/fixer-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ serviceRadius: 200 }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.errors ?? payload.message).toBeTruthy();
    });

    it('updates fixer settings successfully', async () => {
      const userDoc = makeFixerDoc();
      (User.findById as jest.Mock).mockResolvedValue(userDoc);

      const response = await PUT(
        new Request('http://localhost/api/user/fixer-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ availableNow: true, serviceRadius: 25 }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(userDoc.availableNow).toBe(true);
      expect(userDoc.serviceRadius).toBe(25);
      expect(userDoc.save).toHaveBeenCalled();
    });

    it('returns 403 when hirer tries to update fixer settings', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
      const hirerDoc = makeFixerDoc({ role: 'hirer' });
      (User.findById as jest.Mock).mockResolvedValue(hirerDoc);

      const response = await PUT(
        new Request('http://localhost/api/user/fixer-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ availableNow: true }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(403);
      expect(payload.message ?? payload.error).toBeTruthy();
    });
  });
});
