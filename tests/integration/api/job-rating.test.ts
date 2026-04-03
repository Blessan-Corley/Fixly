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

jest.mock('@/lib/validations/content-policy', () => ({
  moderateUserGeneratedContent: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/api/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireSession: jest.fn(),
  };
});

jest.mock('@/lib/api/parse', () => ({
  parseBody: jest.fn(),
}));

jest.mock('@/lib/api/response', () => {
  const { NextResponse } = require('next/server');
  return {
    badRequest: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 400 })
    ),
    forbidden: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 403 })
    ),
    notFound: jest.fn((entity: string) =>
      NextResponse.json({ message: `${entity} not found` }, { status: 404 })
    ),
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

import { POST } from '@/app/api/jobs/[jobId]/rating/route';
import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { csrfGuard } from '@/lib/security/csrf';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import User from '@/models/User';

const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';
const JOB_ID = '507f1f77bcf86cd799439011';
const HIRER_ID = 'test-user-hirer-id';
const FIXER_ID = '507f1f77bcf86cd799439022';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer', userId?: string) {
  return {
    user: {
      id: userId ?? (role === 'hirer' ? HIRER_ID : FIXER_ID),
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
      id: HIRER_ID,
      email: 'test@example.com',
      role: 'hirer',
      csrfToken: 'a'.repeat(64),
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeRequest(body?: unknown): Request {
  return new Request(`http://localhost/api/jobs/${JOB_ID}/rating`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
    body: body ? JSON.stringify(body) : JSON.stringify({ rating: 4 }),
  }) as unknown as NextRequest;
}

describe('POST /api/jobs/[jobId]/rating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({ data: { rating: 4 } });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    (requireSession as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token mismatches', async () => {
    (requireSession as jest.Mock).mockResolvedValue({ session: sessionWithMismatchedCsrf() });
    (csrfGuard as jest.Mock).mockReturnValue(
      new Response(JSON.stringify({ error: 'CSRF_INVALID' }), { status: 403 })
    );

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    expect(response.status).toBe(403);
  });

  it('returns 400 when rating is out of range (too high)', async () => {
    (parseBody as jest.Mock).mockResolvedValue({ data: { rating: 10 } });

    const response = await POST(makeRequest({ rating: 10 }), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toMatch(/rating/i);
  });

  it('returns 400 when rating is out of range (too low)', async () => {
    (parseBody as jest.Mock).mockResolvedValue({ data: { rating: 0 } });

    const response = await POST(makeRequest({ rating: 0 }), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toMatch(/rating/i);
  });

  it('returns 400 when review text exceeds 1000 chars', async () => {
    const longReview = 'a'.repeat(1001);
    (parseBody as jest.Mock).mockResolvedValue({ data: { rating: 4, review: longReview } });

    const response = await POST(makeRequest({ rating: 4, review: longReview }), {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toMatch(/1000/i);
  });

  it('returns 400 when review content fails moderation', async () => {
    (parseBody as jest.Mock).mockResolvedValue({
      data: { rating: 4, review: 'Terrible experience with awful behavior' },
    });
    (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({
      allowed: false,
      message: 'Review contains inappropriate content',
      violations: ['profanity'],
      suggestions: [],
    });

    const response = await POST(
      makeRequest({ rating: 4, review: 'Terrible experience with awful behavior' }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('inappropriate');
  });

  it('returns 400 when category ratings are out of range', async () => {
    (parseBody as jest.Mock).mockResolvedValue({
      data: { rating: 4, categories: { communication: 10, quality: 3 } },
    });

    const response = await POST(
      makeRequest({ rating: 4, categories: { communication: 10, quality: 3 } }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toMatch(/category/i);
  });

  it('returns 404 when user not found', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    expect(response.status).toBe(404);
  });

  it('returns 403 when user account is banned', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: HIRER_ID, name: 'Hirer', role: 'hirer', banned: true }),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toMatch(/suspended/i);
  });

  it('returns 404 when job not found', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: HIRER_ID,
        name: 'Hirer',
        role: 'hirer',
        banned: false,
      }),
    });
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    expect(response.status).toBe(404);
  });

  it('returns 400 when job is not completed', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: HIRER_ID,
        name: 'Hirer',
        role: 'hirer',
        banned: false,
      }),
    });
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: JOB_ID,
        title: 'Test Job',
        status: 'in_progress',
        createdBy: HIRER_ID,
        assignedTo: FIXER_ID,
        completion: {},
      }),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toMatch(/completed/i);
  });

  it('returns 400 when job has no assigned fixer', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: HIRER_ID,
        name: 'Hirer',
        role: 'hirer',
        banned: false,
      }),
    });
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: JOB_ID,
        title: 'Test Job',
        status: 'completed',
        createdBy: HIRER_ID,
        assignedTo: null,
        completion: {},
      }),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toMatch(/fixer/i);
  });

  it('returns 403 when user is not a job participant', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'outsider-id',
        name: 'Outsider',
        role: 'hirer',
        banned: false,
      }),
    });
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: JOB_ID,
        title: 'Test Job',
        status: 'completed',
        createdBy: 'actual-hirer-id',
        assignedTo: 'actual-fixer-id',
        completion: {},
      }),
    });
    const outsiderSession = { ...createTestSession('hirer'), user: { ...createTestSession('hirer').user, id: 'outsider-id' } };
    (requireSession as jest.Mock).mockResolvedValue({ session: outsiderSession });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toMatch(/participant/i);
  });

  it('returns 400 when hirer has already submitted a rating', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: HIRER_ID,
        name: 'Hirer',
        role: 'hirer',
        banned: false,
      }),
    });
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: JOB_ID,
        title: 'Test Job',
        status: 'completed',
        createdBy: HIRER_ID,
        assignedTo: FIXER_ID,
        completion: {
          fixerRating: {
            rating: 5,
            review: 'Great',
            ratedBy: HIRER_ID,
            ratedAt: new Date(),
          },
        },
      }),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ jobId: JOB_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toMatch(/already rated/i);
  });

  it('returns 200 on successful hirer rating submission', async () => {
    const mockHirer = {
      _id: HIRER_ID,
      name: 'Test Hirer',
      role: 'hirer',
      banned: false,
    };
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockHirer),
    });

    const mockJob = {
      _id: JOB_ID,
      title: 'Test Job',
      status: 'completed',
      createdBy: HIRER_ID,
      assignedTo: FIXER_ID,
      completion: {},
      save: jest.fn().mockResolvedValue(undefined),
      updateReviewStatus: jest.fn(),
    };
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockJob),
    });

    const mockRatedUser = {
      _id: FIXER_ID,
      name: 'Test Fixer',
      addNotification: jest.fn().mockResolvedValue(undefined),
      updateRating: jest.fn().mockResolvedValue(undefined),
    };
    // findById for ratedUser is the 2nd call
    (User.findById as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(mockHirer),
      })
      .mockResolvedValueOnce(mockRatedUser);

    const response = await POST(makeRequest({ rating: 4, review: 'Great work done' }), {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toMatch(/submitted/i);
    expect(mockJob.save).toHaveBeenCalled();
  });

  it('returns 200 on successful fixer rating submission (fixer rates hirer)', async () => {
    const fixerSession = createTestSession('fixer', FIXER_ID);
    (requireSession as jest.Mock).mockResolvedValue({ session: fixerSession });

    const mockFixer = {
      _id: FIXER_ID,
      name: 'Test Fixer',
      role: 'fixer',
      banned: false,
    };
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockFixer),
    });

    const mockJob = {
      _id: JOB_ID,
      title: 'Test Job',
      status: 'completed',
      createdBy: 'hirer-id',
      assignedTo: FIXER_ID,
      completion: {},
      save: jest.fn().mockResolvedValue(undefined),
      updateReviewStatus: jest.fn(),
    };
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockJob),
    });

    const mockRatedHirer = {
      _id: 'hirer-id',
      name: 'Test Hirer',
      addNotification: jest.fn().mockResolvedValue(undefined),
      updateRating: jest.fn().mockResolvedValue(undefined),
    };
    (User.findById as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(mockFixer),
      })
      .mockResolvedValueOnce(mockRatedHirer);

    const response = await POST(makeRequest({ rating: 5, review: 'Clear instructions provided' }), {
      params: Promise.resolve({ jobId: JOB_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });
});
