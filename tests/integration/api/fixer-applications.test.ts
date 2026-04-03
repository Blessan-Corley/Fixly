jest.mock('mongoose', () => {
  function MockObjectId(value: string) {
    return value;
  }
  MockObjectId.isValid = jest.fn(
    (value: string) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
  );
  return {
    Types: {
      ObjectId: MockObjectId,
    },
  };
});

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
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/lib/authorization', () => {
  const { NextResponse } = require('next/server');
  return {
    requirePermission: jest.fn(),
    createStandardError: jest.fn((status: number, code: string, message: string) =>
      NextResponse.json({ error: { code, message } }, { status })
    ),
  };
});

jest.mock('@/lib/api', () => {
  const { NextResponse } = require('next/server');
  return {
    badRequest: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 400 })
    ),
    parseQuery: jest.fn(),
    requireSession: jest.fn(),
    respond: jest.fn((data: unknown, status = 200) => NextResponse.json(data, { status })),
    serverError: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 500 })
    ),
  };
});

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Types } from 'mongoose';

import { GET } from '@/app/api/fixer/applications/route';
import { requireSession, parseQuery, respond } from '@/lib/api';
import { requirePermission, createStandardError } from '@/lib/authorization';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';
const FIXER_ID = '507f1f77bcf86cd799439011';
const JOB_ID = '507f1f77bcf86cd799439022';
const APP_ID = '507f1f77bcf86cd799439033';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'fixer', userId?: string) {
  return {
    user: {
      id: userId ?? FIXER_ID,
      email: `test@example.com`,
      role,
      name: `Test ${role}`,
      csrfToken: TEST_CSRF_TOKEN,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeGetRequest(queryString = ''): Request {
  return new Request(`http://localhost/api/fixer/applications${queryString}`, {
    method: 'GET',
    headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
  }) as unknown as NextRequest;
}

function mockJobsResult(applications: unknown[] = []) {
  const jobs = applications.map((app, i) => ({
    _id: `job-id-${i}`,
    title: `Test Job ${i}`,
    description: `Description ${i}`,
    budget: 100,
    location: { city: 'Lagos' },
    status: 'open',
    createdAt: new Date(),
    deadline: null,
    skillsRequired: [],
    createdBy: { _id: 'hirer-id', name: 'Hirer', username: 'hirer' },
    assignedTo: null,
    applications: [app],
  }));

  return {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(jobs),
  };
}

describe('GET /api/fixer/applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession('fixer') });
    (requirePermission as jest.Mock).mockImplementation(() => {
      // does not throw for fixer role
    });
    (parseQuery as jest.Mock).mockReturnValue({
      data: { page: 1, limit: 10, status: undefined, search: undefined },
    });
    (Job.countDocuments as jest.Mock).mockResolvedValue(0);
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    (requireSession as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await GET(makeGetRequest() as NextRequest);
    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await GET(makeGetRequest() as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toMatch(/too many requests/i);
  });

  it('returns 403 when user is a hirer', async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (requirePermission as jest.Mock).mockImplementation(() => {
      const error = new Error('Forbidden') as Error & { status?: number; code?: string };
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    });

    const response = await GET(makeGetRequest() as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error?.code ?? payload.error).toMatch(/forbidden/i);
  });

  it('returns 200 with empty applications list', async () => {
    (Job.find as jest.Mock).mockReturnValue(mockJobsResult([]));
    (Job.countDocuments as jest.Mock).mockResolvedValue(0);

    const response = await GET(makeGetRequest() as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.applications)).toBe(true);
    expect(payload.applications.length).toBe(0);
  });

  it('returns 200 with applications list for fixer', async () => {
    const application = {
      _id: APP_ID,
      fixer: FIXER_ID,
      proposedAmount: 500,
      coverLetter: 'I can do this job',
      status: 'pending',
      appliedAt: new Date(),
      materialsList: [],
    };

    (Job.find as jest.Mock).mockReturnValue(mockJobsResult([application]));
    (Job.countDocuments as jest.Mock).mockResolvedValue(1);

    const response = await GET(makeGetRequest() as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.applications)).toBe(true);
    expect(payload.pagination).toBeDefined();
    expect(payload.pagination.currentPage).toBe(1);
    expect(payload.pagination.totalApplications).toBe(1);
  });

  it('returns 200 with correct pagination metadata', async () => {
    (parseQuery as jest.Mock).mockReturnValue({
      data: { page: 2, limit: 5, status: undefined, search: undefined },
    });

    const applications = Array.from({ length: 5 }, (_, i) => ({
      _id: `app-id-${i}`,
      fixer: FIXER_ID,
      status: 'pending',
      appliedAt: new Date(),
    }));

    (Job.find as jest.Mock).mockReturnValue(mockJobsResult(applications));
    (Job.countDocuments as jest.Mock).mockResolvedValue(12);

    const response = await GET(makeGetRequest('?page=2&limit=5') as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.pagination.currentPage).toBe(2);
    expect(payload.pagination.totalPages).toBe(Math.ceil(12 / 5));
    expect(payload.pagination.hasNextPage).toBeDefined();
    expect(payload.pagination.hasPreviousPage).toBe(true);
  });

  it('returns 200 filtered by status=accepted', async () => {
    (parseQuery as jest.Mock).mockReturnValue({
      data: { page: 1, limit: 10, status: 'accepted', search: undefined },
    });

    const acceptedApplication = {
      _id: APP_ID,
      fixer: FIXER_ID,
      status: 'accepted',
      appliedAt: new Date(),
    };

    (Job.find as jest.Mock).mockReturnValue(mockJobsResult([acceptedApplication]));
    (Job.countDocuments as jest.Mock).mockResolvedValue(1);

    const response = await GET(makeGetRequest('?status=accepted') as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it('returns 200 filtered by search query', async () => {
    (parseQuery as jest.Mock).mockReturnValue({
      data: { page: 1, limit: 10, status: undefined, search: 'plumbing' },
    });

    (Job.find as jest.Mock).mockReturnValue(mockJobsResult([]));
    (Job.countDocuments as jest.Mock).mockResolvedValue(0);

    const response = await GET(makeGetRequest('?search=plumbing') as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.applications).toHaveLength(0);
  });

  it('returns 500 on database error', async () => {
    (Job.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    });

    const response = await GET(makeGetRequest() as NextRequest);
    expect(response.status).toBe(500);
  });
});
