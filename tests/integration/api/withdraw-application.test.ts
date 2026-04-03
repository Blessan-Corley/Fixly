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
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/job/workflow', () => ({
  withdrawApplicationOnJob: jest.fn(),
  countActiveApplicationsOnJob: jest.fn().mockReturnValue(2),
}));

jest.mock('@/app/api/jobs/[jobId]/job-route-utils', () => ({
  invalidateJobReadCaches: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/api/jobs/[jobId]/realtime', () => ({
  publishJobCountsUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/api', () => {
  const { NextResponse } = require('next/server');
  return {
    notFound: jest.fn((entity: string) =>
      NextResponse.json({ message: `${entity} not found` }, { status: 404 })
    ),
    badRequest: jest.fn((msg) => { const { NextResponse } = require('next/server'); return NextResponse.json({ message: msg }, { status: 400 }); }),
    parseBody: jest.fn(),
    requireSession: jest.fn(),
    respond: jest.fn((data: unknown, status = 200) => NextResponse.json(data, { status })),
    serverError: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 500 })
    ),
    unauthorized: jest.fn(() =>
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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

import { POST } from '@/app/api/jobs/[jobId]/applications/withdraw/route';
import { requireSession, parseBody } from '@/lib/api';
import { csrfGuard } from '@/lib/security/csrf';
import { withdrawApplicationOnJob, countActiveApplicationsOnJob } from '@/models/job/workflow';
import Job from '@/models/Job';
import User from '@/models/User';

const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';
const JOB_ID = '507f1f77bcf86cd799439011';
const FIXER_ID = 'test-user-fixer-id';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'fixer') {
  return {
    user: {
      id: FIXER_ID,
      email: `test@example.com`,
      role,
      name: `Test ${role}`,
      csrfToken: TEST_CSRF_TOKEN,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function sessionWithMismatchedCsrf() {
  return {
    user: {
      id: FIXER_ID,
      email: 'test@example.com',
      role: 'fixer',
      csrfToken: 'a'.repeat(64),
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeRequest(method = 'POST', body?: unknown): Request {
  return new Request(`http://localhost/api/jobs/${JOB_ID}/applications/withdraw`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  }) as unknown as NextRequest;
}

describe('POST /api/jobs/[jobId]/applications/withdraw', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession('fixer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    (requireSession as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token mismatches', async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: sessionWithMismatchedCsrf() });
    (csrfGuard as jest.Mock).mockReturnValue(
      new Response(JSON.stringify({ error: 'CSRF_INVALID' }), { status: 403 })
    );

    const response = await POST(
      new Request(`http://localhost/api/jobs/${JOB_ID}/applications/withdraw`, {
        method: 'POST',
        headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify({}),
      }) as unknown as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(403);
  });

  it('returns 403 when user is banned', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: FIXER_ID, role: 'fixer', banned: true }),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toMatch(/suspended/i);
  });

  it('returns 403 when user is not a fixer', async () => {
    const hirerSession = createTestSession('hirer');
    (requireSession as jest.Mock).mockResolvedValue({ session: hirerSession });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'hirer-id', role: 'hirer', banned: false }),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toMatch(/fixer/i);
  });

  it('returns 404 when user not found', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    expect(response.status).toBe(404);
  });

  it('returns 404 when job not found', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: FIXER_ID, role: 'fixer', banned: false }),
    });
    (Job.findById as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    expect(response.status).toBe(404);
  });

  it('returns 404 when no pending application found for this fixer', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: FIXER_ID, role: 'fixer', banned: false }),
    });
    const mockJob = {
      _id: JOB_ID,
      applications: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValue(mockJob);
    (withdrawApplicationOnJob as jest.Mock).mockReturnValue({ ok: false });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    expect(response.status).toBe(404);
  });

  it('returns 200 on successful withdrawal', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: FIXER_ID, role: 'fixer', banned: false }),
    });
    const mockJob = {
      _id: JOB_ID,
      applications: [
        { _id: 'app-1', fixer: FIXER_ID, status: 'pending' },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValue(mockJob);
    (withdrawApplicationOnJob as jest.Mock).mockReturnValue({ ok: true });
    (countActiveApplicationsOnJob as jest.Mock).mockReturnValue(1);

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toMatch(/withdrawn/i);
    expect(payload.applicationCount).toBe(1);
    expect(mockJob.save).toHaveBeenCalled();
  });

  it('returns 400 when job ID is invalid', async () => {
    (parseBody as jest.Mock).mockResolvedValue({ data: {} });

    const response = await POST(
      new Request(`http://localhost/api/jobs/invalid-id/applications/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify({}),
      }) as unknown as NextRequest,
      { params: Promise.resolve({ jobId: 'invalid-id' }) }
    );
    expect(response.status).toBe(400);
  });
});
