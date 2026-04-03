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
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/lib/services/saved-jobs', () => ({
  saveJobForUser: jest.fn(),
  unsaveJobForUser: jest.fn(),
  listSavedJobs: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: { NODE_ENV: 'test' },
}));

jest.mock('@/lib/api', () => {
  const { NextResponse } = require('next/server');
  return {
    requireSession: jest.fn(),
    getOptionalSession: jest.fn(),
    badRequest: jest.fn((msg: string) => NextResponse.json({ message: msg }, { status: 400 })),
    notFound: jest.fn((entity: string) =>
      NextResponse.json({ message: `${entity} not found` }, { status: 404 })
    ),
    unauthorized: jest.fn(() => NextResponse.json({ error: 'Authentication required' }, { status: 401 })),
    respond: jest.fn((data: unknown, status = 200) => NextResponse.json(data, { status })),
    tooManyRequests: jest.fn((msg: string) => NextResponse.json({ message: msg }, { status: 429 })),
  };
});

jest.mock('@/lib/api/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireSession: jest.fn(),
    getOptionalSession: jest.fn(),
  };
});

jest.mock('@/lib/api/response', () => {
  const { NextResponse } = require('next/server');
  return {
    apiSuccess: jest.fn((data: unknown, options?: { message?: string; status?: number; meta?: unknown }) => {
      const status = options?.status ?? 200;
      return NextResponse.json({ success: true, data, message: options?.message, meta: options?.meta }, { status });
    }),
    Errors: {
      unauthorized: jest.fn(() => NextResponse.json({ error: 'Authentication required' }, { status: 401 })),
      forbidden: jest.fn(() => NextResponse.json({ error: 'Forbidden' }, { status: 403 })),
      notFound: jest.fn((entity: string) =>
        NextResponse.json({ error: `${entity} not found` }, { status: 404 })
      ),
      validation: jest.fn((errors: unknown) =>
        NextResponse.json({ error: 'Validation failed', details: errors }, { status: 422 })
      ),
      internal: jest.fn((msg?: string) =>
        NextResponse.json({ error: msg ?? 'Internal server error' }, { status: 500 })
      ),
    },
    buildPaginationMeta: jest.fn((total: number, page: number, limit: number) => ({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })),
  };
});

jest.mock('@/lib/api/parse', () => ({
  parseBody: jest.fn(),
  parseQuery: jest.fn(),
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn().mockReturnValue(null),
}));

import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { GET as getLikes, POST as postLike } from '@/app/api/jobs/[jobId]/like/route';
import { DELETE as deleteJobSave, POST as saveJob } from '@/app/api/jobs/[jobId]/save/route';
import { DELETE as deleteFromSaved, GET as getSaved, POST as postToSaved } from '@/app/api/jobs/saved/route';
import { requireSession, getOptionalSession } from '@/lib/api';
import { requireSession as requireSessionAuth } from '@/lib/api/auth';
import { apiSuccess, Errors } from '@/lib/api/response';
import { parseBody, parseQuery } from '@/lib/api/parse';
import { csrfGuard } from '@/lib/security/csrf';
import { listSavedJobs, saveJobForUser, unsaveJobForUser } from '@/lib/services/saved-jobs';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';
const JOB_ID = '507f1f77bcf86cd799439011';
const USER_ID = 'test-user-hirer-id';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: {
      id: USER_ID,
      email: `test@example.com`,
      role,
      csrfToken: TEST_CSRF_TOKEN,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function sessionWithMismatchedCsrf() {
  return {
    user: {
      id: USER_ID,
      email: `test@example.com`,
      role: 'hirer',
      csrfToken: 'a'.repeat(64),
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe('POST /api/jobs/[jobId]/like', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
  });

  it('returns 401 when no session', async () => {
    (requireSession as jest.Mock).mockResolvedValue({ error: { status: 401, json: async () => ({ error: 'Authentication required' }) } });
    // Re-use the actual route response check by checking for error in auth
    const mockAuthError = new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    (requireSession as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await postLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await postLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(429);
  });

  it('returns 404 when job not found', async () => {
    const session = createTestSession('fixer');
    (requireSession as jest.Mock).mockResolvedValue({ session });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: USER_ID, name: 'Test', banned: false }),
    });
    (Job.findById as jest.Mock).mockResolvedValue(null);

    const response = await postLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 on successful like toggle', async () => {
    const session = createTestSession('fixer');
    session.user.id = 'fixer-user-id';
    (requireSession as jest.Mock).mockResolvedValue({ session });

    const mockUser = { _id: 'fixer-user-id', name: 'Fixer', banned: false };
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    const mockJob = {
      _id: JOB_ID,
      createdBy: 'other-hirer-id',
      title: 'Test Job',
      toggleLike: jest.fn().mockReturnValue({ liked: true, likeCount: 1 }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValueOnce(mockJob).mockResolvedValueOnce(null);

    const response = await postLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.liked).toBe(true);
    expect(payload.likeCount).toBe(1);
  });
});

describe('GET /api/jobs/[jobId]/like', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Job.findById as jest.Mock).mockReset();
    (getOptionalSession as jest.Mock).mockResolvedValue(null);
  });

  it('returns 404 when job not found', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
    });

    const response = await getLikes(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 with like count', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: JOB_ID,
            likes: [{ user: 'user-1' }, { user: 'user-2' }],
          }),
        }),
      }),
    });

    const response = await getLikes(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.likeCount).toBe(2);
    expect(payload.liked).toBe(false);
  });
});

describe('POST /api/jobs/[jobId]/save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (requireSessionAuth as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    (requireSessionAuth as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = (await saveJob(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/save`) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    expect(response.status).toBe(401);
  });

  it('returns 404 when job not found', async () => {
    (saveJobForUser as jest.Mock).mockRejectedValue(new Error('Job not found'));

    const response = (await saveJob(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/save`) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    expect(response.status).toBe(404);
  });

  it('returns 201 on successful save', async () => {
    (saveJobForUser as jest.Mock).mockResolvedValue({ saved: true, jobId: JOB_ID });

    const response = (await saveJob(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/save`) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    expect(response.status).toBe(201);
  });
});

describe('DELETE /api/jobs/[jobId]/save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireSessionAuth as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
  });

  it('returns 200 on successful unsave', async () => {
    (unsaveJobForUser as jest.Mock).mockResolvedValue(undefined);

    const response = (await deleteJobSave(
      makeRequest('DELETE', `http://localhost/api/jobs/${JOB_ID}/save`) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data?.saved ?? payload.saved).toBe(false);
  });

  it('returns 404 when user not found on unsave', async () => {
    (unsaveJobForUser as jest.Mock).mockRejectedValue(new Error('User not found'));

    const response = (await deleteJobSave(
      makeRequest('DELETE', `http://localhost/api/jobs/${JOB_ID}/save`) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    expect(response.status).toBe(404);
  });
});

describe('GET /api/jobs/saved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireSessionAuth as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (parseQuery as jest.Mock).mockReturnValue({ data: { page: 1, limit: 20 } });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
    (requireSessionAuth as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await getSaved(
      makeRequest('GET', 'http://localhost/api/jobs/saved') as NextRequest
    );
    expect(response.status).toBe(401);
  });

  it('returns 200 with saved jobs list', async () => {
    (listSavedJobs as jest.Mock).mockResolvedValue({
      items: [{ _id: JOB_ID, title: 'Test Job' }],
      total: 1,
    });

    const response = await getSaved(
      makeRequest('GET', 'http://localhost/api/jobs/saved') as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it('returns 200 with empty list when no saved jobs', async () => {
    (listSavedJobs as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    const response = await getSaved(
      makeRequest('GET', 'http://localhost/api/jobs/saved') as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data.length).toBe(0);
  });
});

describe('POST /api/jobs/saved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireSessionAuth as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({ data: { jobId: JOB_ID } });
  });

  it('returns 201 on successful save', async () => {
    (saveJobForUser as jest.Mock).mockResolvedValue({ saved: true, jobId: JOB_ID });

    const response = await postToSaved(
      makeRequest('POST', 'http://localhost/api/jobs/saved', { jobId: JOB_ID }) as NextRequest
    );
    expect(response.status).toBe(201);
  });

  it('returns 404 when job not found', async () => {
    (saveJobForUser as jest.Mock).mockRejectedValue(new Error('Job not found'));

    const response = await postToSaved(
      makeRequest('POST', 'http://localhost/api/jobs/saved', { jobId: JOB_ID }) as NextRequest
    );
    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/jobs/saved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireSessionAuth as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({ data: { jobId: JOB_ID } });
  });

  it('returns 200 on successful unsave', async () => {
    (unsaveJobForUser as jest.Mock).mockResolvedValue(undefined);

    // The route uses req.nextUrl.searchParams — provide a plain Request cast to NextRequest
    // and attach a nextUrl shim so the query-param branch resolves jobId directly.
    const rawRequest = new Request(
      `http://localhost/api/jobs/saved?jobId=${JOB_ID}`,
      { method: 'DELETE', headers: { 'x-csrf-token': TEST_CSRF_TOKEN } }
    );
    const request = Object.assign(rawRequest, {
      nextUrl: new URL(`http://localhost/api/jobs/saved?jobId=${JOB_ID}`),
    }) as unknown as NextRequest;

    const response = await deleteFromSaved(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data?.saved ?? payload.saved).toBe(false);
  });
});
