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

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/models/job/workflow', () => ({
  countActiveApplicationsOnJob: jest.fn(() => 0),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/lib/redisCache', () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  withCache: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { GET } from '@/app/api/jobs/browse/route';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/jobs/browse', () => {
  const hirerId = '507f1f77bcf86cd799439011';

  const makeQueryChain = (result: unknown[]) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: hirerId, role: 'hirer', csrfToken: 'test-csrf' },
    });
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await GET(new Request('http://localhost/api/jobs/browse'));

    expect(response.status).toBe(429);
  });

  it('returns paginated jobs for authenticated user', async () => {
    const jobs = [
      {
        _id: '507f1f77bcf86cd799439031',
        title: 'Fix plumbing',
        description: 'Pipe burst in kitchen',
        status: 'open',
        createdBy: { _id: hirerId, name: 'Hirer', rating: 4.0 },
        applications: [],
        comments: [],
        budget: { type: 'fixed', amount: 5000 },
        location: { city: 'Mumbai', state: 'Maharashtra' },
        createdAt: new Date(),
      },
    ];

    (Job.find as jest.Mock).mockReturnValue(makeQueryChain(jobs));
    (Job.countDocuments as jest.Mock).mockResolvedValue(1);

    const response = await GET(new Request('http://localhost/api/jobs/browse'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.jobs)).toBe(true);
    expect(payload.jobs).toHaveLength(1);
    expect(payload.pagination).toBeDefined();
    expect(payload.pagination.total).toBe(1);
  });

  it('filters by category/skills when query param provided', async () => {
    const jobs = [
      {
        _id: '507f1f77bcf86cd799439031',
        title: 'Electrical fix',
        description: 'Wiring repair',
        status: 'open',
        createdBy: { _id: hirerId, name: 'Hirer', rating: 4.0 },
        applications: [],
        comments: [],
        budget: { type: 'fixed', amount: 3000 },
        location: { city: 'Delhi', state: 'Delhi' },
        skillsRequired: ['electrical'],
        createdAt: new Date(),
      },
    ];

    (Job.find as jest.Mock).mockReturnValue(makeQueryChain(jobs));
    (Job.countDocuments as jest.Mock).mockResolvedValue(1);

    const response = await GET(
      new Request('http://localhost/api/jobs/browse?skills=electrical')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    // Verify that the find was called with a skillsRequired filter
    const findCallArg = (Job.find as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(findCallArg.skillsRequired).toBeDefined();
  });

  it('filters by location when query param provided', async () => {
    const jobs = [
      {
        _id: '507f1f77bcf86cd799439032',
        title: 'Painting job',
        description: 'House painting needed',
        status: 'open',
        createdBy: { _id: hirerId, name: 'Hirer', rating: 4.2 },
        applications: [],
        comments: [],
        budget: { type: 'fixed', amount: 10000 },
        location: { city: 'Bangalore', state: 'Karnataka' },
        createdAt: new Date(),
      },
    ];

    (Job.find as jest.Mock).mockReturnValue(makeQueryChain(jobs));
    (Job.countDocuments as jest.Mock).mockResolvedValue(1);

    const response = await GET(
      new Request('http://localhost/api/jobs/browse?location=Bangalore')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const findCallArg = (Job.find as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(findCallArg.$and).toBeDefined();
  });

  it('returns empty array when no jobs match filters', async () => {
    (Job.find as jest.Mock).mockReturnValue(makeQueryChain([]));
    (Job.countDocuments as jest.Mock).mockResolvedValue(0);

    const response = await GET(
      new Request('http://localhost/api/jobs/browse?skills=quantum-physics')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.jobs).toHaveLength(0);
    expect(payload.pagination.total).toBe(0);
  });
});
