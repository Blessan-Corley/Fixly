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

jest.mock('@/lib/services/dashboardStatsService', () => ({
  getDashboardStats: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn(() => ({ valid: true })),
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
}));

import { getServerSession } from 'next-auth/next';
import type { NextRequest } from 'next/server';

import { GET as getStats } from '@/app/api/dashboard/stats/route';
import { GET as getRecentJobs } from '@/app/api/dashboard/recent-jobs/route';
import { getDashboardStats } from '@/lib/services/dashboardStatsService';
import { redisUtils } from '@/lib/redis';
import User from '@/models/User';
import Job from '@/models/Job';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

const makeRequest = (method: string, url: string, body?: Record<string, unknown>) =>
  new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;

// ─── /api/dashboard/stats ───────────────────────────────────────────────────

describe('/api/dashboard/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const response = await getStats(makeRequest('GET', 'http://localhost/api/dashboard/stats'));
    expect(response.status).toBe(401);
  });

  it('returns 401 for temp_ user IDs', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'temp_abc123', role: 'hirer', csrfToken: TEST_CSRF_TOKEN },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const response = await getStats(makeRequest('GET', 'http://localhost/api/dashboard/stats'));
    expect(response.status).toBe(401);
  });

  it('returns 400 when role is missing from session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-id-123', csrfToken: TEST_CSRF_TOKEN },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const response = await getStats(makeRequest('GET', 'http://localhost/api/dashboard/stats'));
    expect(response.status).toBe(400);
  });

  it('returns 200 with hirer stats', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (getDashboardStats as jest.Mock).mockResolvedValue({
      totalJobs: 5,
      activeJobs: 2,
      completedJobs: 3,
    });

    const response = await getStats(makeRequest('GET', 'http://localhost/api/dashboard/stats'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data ?? payload).toMatchObject({ totalJobs: 5, activeJobs: 2 });
  });

  it('returns 200 with fixer stats', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));
    (getDashboardStats as jest.Mock).mockResolvedValue({
      totalApplications: 10,
      pendingApplications: 3,
    });

    const response = await getStats(makeRequest('GET', 'http://localhost/api/dashboard/stats'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data ?? payload).toMatchObject({ totalApplications: 10 });
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await getStats(makeRequest('GET', 'http://localhost/api/dashboard/stats'));
    expect(response.status).toBe(429);
  });

  it('returns 500 when getDashboardStats throws', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (getDashboardStats as jest.Mock).mockRejectedValue(new Error('DB failure'));

    const response = await getStats(makeRequest('GET', 'http://localhost/api/dashboard/stats'));
    expect(response.status).toBe(500);
  });
});

// ─── /api/dashboard/recent-jobs ─────────────────────────────────────────────

describe('/api/dashboard/recent-jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (redisUtils.get as jest.Mock).mockResolvedValue(null);
    (redisUtils.set as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const response = await getRecentJobs(makeRequest('GET', 'http://localhost/api/dashboard/recent-jobs'));
    expect(response.status).toBe(401);
  });

  it('returns 404 when user not found in DB', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    const response = await getRecentJobs(makeRequest('GET', 'http://localhost/api/dashboard/recent-jobs'));
    expect(response.status).toBe(404);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await getRecentJobs(makeRequest('GET', 'http://localhost/api/dashboard/recent-jobs'));
    expect(response.status).toBe(429);
  });

  it('returns cached response with X-Cache: HIT header when cache is warm', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'test-user-hirer-id', role: 'hirer' }),
    });

    const cachedPayload = {
      success: true,
      jobs: [{ _id: 'job1', title: 'Fix roof' }],
      total: 1,
      role: 'hirer',
      _cacheTimestamp: new Date().toISOString(),
    };
    (redisUtils.get as jest.Mock).mockResolvedValue(cachedPayload);

    const response = await getRecentJobs(makeRequest('GET', 'http://localhost/api/dashboard/recent-jobs'));

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('HIT');
    const payload = await response.json();
    expect(payload.cached).toBe(true);
  });

  it('returns 200 with hirer jobs from DB when cache is cold', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'test-user-hirer-id', role: 'hirer' }),
    });

    const mockJobs = [{ _id: 'job1', title: 'Plumbing', applications: [{ status: 'pending' }] }];
    (Job.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockJobs),
    });

    const response = await getRecentJobs(makeRequest('GET', 'http://localhost/api/dashboard/recent-jobs'));

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('MISS');
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.role).toBe('hirer');
    expect(Array.isArray(payload.jobs)).toBe(true);
  });

  it('returns 200 with fixer jobs from DB when cache is cold', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ _id: 'test-user-fixer-id', role: 'fixer' }),
    });

    (Job.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const response = await getRecentJobs(makeRequest('GET', 'http://localhost/api/dashboard/recent-jobs'));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.role).toBe('fixer');
  });
});
