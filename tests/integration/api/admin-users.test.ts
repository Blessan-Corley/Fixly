jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(
        (value: string) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
      ),
    },
  },
}));

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

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('@/lib/admin-notifications', () => ({
  sendAdminNotification: jest.fn(),
}));

jest.mock('@/lib/redisCache', () => ({
  withCache: jest.fn((fn: () => unknown) => fn()),
  invalidateCache: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  getRedis: jest.fn(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  })),
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
  },
}));

jest.mock('@/lib/auth-utils', () => ({
  invalidateAuthCache: jest.fn(),
}));

jest.mock('@/lib/services/adminMetricsService', () => ({
  invalidateAdminMetricsCache: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn(() => ({ valid: true })),
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
}));

import { getServerSession } from 'next-auth/next';

import { GET } from '@/app/api/admin/users/route';
import User from '@/models/User';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/admin/users')
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when non-admin user accesses admin route', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await GET(
      new Request('http://localhost/api/admin/users')
    );

    expect(response.status).toBe(403);
  });

  it('returns paginated users list for admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('admin'));

    const mockUsers = [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'hirer',
        createdAt: new Date('2024-01-01'),
        jobsPosted: 3,
        jobsCompleted: 0,
        plan: null,
        lastLoginAt: null,
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Bob',
        email: 'bob@example.com',
        role: 'fixer',
        createdAt: new Date('2024-02-01'),
        jobsPosted: 0,
        jobsCompleted: 5,
        plan: { type: 'pro', status: 'active' },
        lastLoginAt: new Date('2024-03-01'),
      },
    ];

    (User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUsers),
    });
    (User.countDocuments as jest.Mock).mockResolvedValue(2);

    const response = await GET(
      new Request('http://localhost/api/admin/users?page=1&limit=20')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.users).toHaveLength(2);
    expect(payload.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
    });
  });

  it('filters users by query param when provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('admin'));

    (User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (User.countDocuments as jest.Mock).mockResolvedValue(0);

    const response = await GET(
      new Request('http://localhost/api/admin/users?search=alice')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.filters.search).toBe('alice');
    expect(User.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.any(Array),
      })
    );
  });

  it('returns correct user count', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('admin'));

    const mockUsers = Array.from({ length: 5 }, (_, i) => ({
      _id: `507f1f77bcf86cd79943901${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: 'fixer',
      createdAt: new Date(),
      jobsPosted: 0,
      jobsCompleted: i,
      plan: null,
      lastLoginAt: null,
    }));

    (User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUsers),
    });
    (User.countDocuments as jest.Mock).mockResolvedValue(5);

    const response = await GET(
      new Request('http://localhost/api/admin/users')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.pagination.total).toBe(5);
    expect(payload.users).toHaveLength(5);
  });
});
