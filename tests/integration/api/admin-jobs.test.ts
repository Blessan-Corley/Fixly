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

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  },
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

import { GET } from '@/app/api/admin/jobs/route';
import Job from '@/models/Job';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/admin/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/admin/jobs')
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 when non-admin user accesses admin route', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const response = await GET(
      new Request('http://localhost/api/admin/jobs')
    );

    expect(response.status).toBe(403);
  });

  it('returns paginated jobs list for admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('admin'));

    const mockJobs = [
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Fix plumbing',
        status: 'open',
        createdAt: new Date('2024-01-01'),
        deadline: null,
        applications: [],
        createdBy: { _id: '507f1f77bcf86cd799439099', name: 'Alice' },
        assignedTo: null,
      },
      {
        _id: '507f1f77bcf86cd799439012',
        title: 'Paint walls',
        status: 'in_progress',
        createdAt: new Date('2024-02-01'),
        deadline: new Date('2024-05-01'),
        applications: [{ _id: 'app1' }, { _id: 'app2' }],
        createdBy: { _id: '507f1f77bcf86cd799439098', name: 'Bob' },
        assignedTo: { _id: '507f1f77bcf86cd799439097', name: 'Carol' },
      },
    ];

    (Job.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockJobs),
    });
    (Job.countDocuments as jest.Mock).mockResolvedValue(2);

    const response = await GET(
      new Request('http://localhost/api/admin/jobs?page=1&limit=20')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.jobs).toHaveLength(2);
    expect(payload.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
    });
  });

  it('filters jobs by status when query param provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('admin'));

    (Job.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (Job.countDocuments as jest.Mock).mockResolvedValue(0);

    const response = await GET(
      new Request('http://localhost/api/admin/jobs?status=open')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.filters.status).toBe('open');
    expect(Job.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open' })
    );
  });

  it('returns 429 when rate limited', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('admin'));
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await GET(
      new Request('http://localhost/api/admin/jobs')
    );

    expect(response.status).toBe(429);
  });
});
