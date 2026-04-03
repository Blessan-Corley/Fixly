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

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
    find: jest.fn(),
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

jest.mock('@/lib/authorization', () => ({
  createStandardError: jest.fn((status: number, _code: string, message: string) =>
    new Response(JSON.stringify({ error: { code: _code, message } }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
  requirePermission: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

import { getServerSession } from 'next-auth/next';

import { GET } from '@/app/api/user/earnings/route';
import { requirePermission } from '@/lib/authorization';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import User from '@/models/User';
import { createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/earnings', () => {
  const fixerUserId = 'test-user-fixer-id';
  const hirerUserId = 'test-user-hirer-id';

  const makeEmptyAggregate = () =>
    (Job.aggregate as jest.Mock).mockResolvedValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));
    (redisUtils.get as jest.Mock).mockResolvedValue(null);
    (redisUtils.set as jest.Mock).mockResolvedValue(undefined);
    (requirePermission as jest.Mock).mockReturnValue(undefined);

    // Default: empty aggregate results
    (Job.aggregate as jest.Mock).mockResolvedValue([]);
    (Job.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/user/earnings'));
    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await GET(new Request('http://localhost/api/user/earnings'));
    expect(response.status).toBe(429);
  });

  it('returns 404 when user not found', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const response = await GET(new Request('http://localhost/api/user/earnings'));
    expect(response.status).toBe(404);
  });

  it('returns earnings data for authenticated fixer', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: fixerUserId, role: 'fixer' }),
    });
    (Job.aggregate as jest.Mock).mockResolvedValue([]);

    const response = await GET(new Request('http://localhost/api/user/earnings'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.earnings).toBeDefined();
    expect(typeof payload.earnings.total).toBe('number');
    expect(typeof payload.earnings.completedJobs).toBe('number');
  });

  it('returns correct earnings summary with aggregated data', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: fixerUserId, role: 'fixer' }),
    });

    // First aggregate call (summary) returns totals; rest return empty
    (Job.aggregate as jest.Mock)
      .mockResolvedValueOnce([{ total: 15000, completedJobs: 5 }])
      .mockResolvedValueOnce([{ total: 3000 }])
      .mockResolvedValueOnce([{ total: 1000 }])
      .mockResolvedValueOnce([{ total: 500 }])
      .mockResolvedValueOnce([{ total: 2500 }]);

    const response = await GET(new Request('http://localhost/api/user/earnings'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.earnings.total).toBe(15000);
    expect(payload.earnings.completedJobs).toBe(5);
    expect(payload.earnings.averageJobValue).toBe(3000);
  });

  it('returns cached earnings when cache hit', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: fixerUserId, role: 'fixer' }),
    });

    const cachedPayload = JSON.stringify({
      earnings: {
        total: 9999,
        thisMonth: 100,
        thisWeek: 50,
        lastMonth: 200,
        completedJobs: 3,
        averageJobValue: 3333,
        growth: { monthly: 0, weekly: 0 },
      },
      _cacheTimestamp: new Date().toISOString(),
    });
    (redisUtils.get as jest.Mock).mockResolvedValue(cachedPayload);

    const response = await GET(new Request('http://localhost/api/user/earnings'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.cached).toBe(true);
    expect(payload.earnings.total).toBe(9999);
    // Aggregates should NOT have been called when cache is hit
    expect(Job.aggregate).not.toHaveBeenCalled();
  });

  it('returns earnings data for authenticated hirer', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: hirerUserId, role: 'hirer' }),
    });

    const response = await GET(new Request('http://localhost/api/user/earnings'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.earnings).toBeDefined();
  });
});
