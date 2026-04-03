jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: jest.fn((fn: () => void) => { void Promise.resolve().then(fn); }),
}));

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

jest.mock('@/models/Review', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    getAverageRating: jest.fn(),
  },
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/ably/events', () => ({
  Channels: {
    job: jest.fn((id: string) => `job:${id}`),
  },
  Events: {
    job: { reviewPosted: 'review-posted' },
  },
}));

jest.mock('@/lib/reviews/canonical-review', () => ({
  createCanonicalReview: jest.fn(),
  hasCanonicalReviewForJob: jest.fn(),
  refreshRevieweeAggregateRating: jest.fn(),
}));

jest.mock('@/lib/reviews/job-review', () => ({
  getCompletionReviewStatus: jest.fn(),
  hasExistingCompletionReview: jest.fn(),
  normalizeCompletionReviewCategories: jest.fn().mockReturnValue({}),
  normalizeLegacyReviewType: jest.fn(),
  resolveJobReviewContext: jest.fn(),
  submitJobCompletionReview: jest.fn(),
  toIdString: jest.fn((v: unknown) => String(v)),
}));

jest.mock('@/lib/services/automatedMessaging', () => ({
  sendReviewCompletionMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/public-reviews', () => ({
  createJobReview: jest.fn(),
  listJobReviews: jest.fn(),
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
    getOptionalSession: jest.fn(),
  };
});

jest.mock('@/lib/api/parse', () => ({
  parseBody: jest.fn(),
  parseQuery: jest.fn(),
}));

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
    tooManyRequests: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 429 })
    ),
    unauthorized: jest.fn(() =>
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    ),
  };
});

jest.mock('@/lib/api', () => {
  const { NextResponse } = require('next/server');
  return {
    requireSession: jest.fn(),
    getOptionalSession: jest.fn(),
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
    dbConnect: jest.fn(),
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

import { GET as getReview, POST as postReview } from '@/app/api/jobs/[jobId]/review/route';
import { GET as listReviews, POST as createReview } from '@/app/api/jobs/[jobId]/reviews/route';
import { GET as getReviewStatus } from '@/app/api/jobs/[jobId]/reviews/status/route';
import { requireSession, getOptionalSession } from '@/lib/api';
import { requireSession as requireSessionAuth } from '@/lib/api/auth';
import { parseBody, parseQuery } from '@/lib/api/parse';
import { csrfGuard } from '@/lib/security/csrf';
import { createJobReview, listJobReviews } from '@/lib/services/public-reviews';
import {
  createCanonicalReview,
  hasCanonicalReviewForJob,
  refreshRevieweeAggregateRating,
} from '@/lib/reviews/canonical-review';
import {
  getCompletionReviewStatus,
  hasExistingCompletionReview,
  resolveJobReviewContext,
  submitJobCompletionReview,
} from '@/lib/reviews/job-review';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

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

// ── /api/jobs/[jobId]/review (POST + GET) ─────────────────────────────────────

describe('POST /api/jobs/[jobId]/review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (requireSessionAuth as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({
      data: { rating: 4, review: 'Great work done professionally' },
    });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    // The review route imports requireSession from @/lib/api/auth, not @/lib/api
    (requireSessionAuth as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await postReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/review`, {
        rating: 4,
        review: 'Good work',
      }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await postReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/review`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(429);
  });

  it('returns 400 when rating is out of range', async () => {
    (parseBody as jest.Mock).mockResolvedValue({ data: { rating: 10, review: 'bad rating' } });

    const response = await postReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/review`, {
        rating: 10,
        review: 'bad rating',
      }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when user not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);

    const response = await postReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/review`, {
        rating: 4,
        review: 'Great work done properly',
      }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 404 when job not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: HIRER_ID, name: 'Hirer' });
    (Job.findById as jest.Mock).mockResolvedValue(null);

    const response = await postReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/review`, {
        rating: 4,
        review: 'Great work professionally done',
      }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 400 when job is not completed', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: HIRER_ID, name: 'Hirer' });
    (Job.findById as jest.Mock).mockResolvedValue({
      _id: JOB_ID,
      status: 'open',
      assignedTo: FIXER_ID,
      createdBy: HIRER_ID,
    });

    const response = await postReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/review`, {
        rating: 4,
        review: 'Good work professionally done',
      }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(400);
  });

  it('returns 201 on successful review submission', async () => {
    (User.findById as jest.Mock).mockResolvedValue({
      _id: HIRER_ID,
      name: 'Hirer',
      addNotification: jest.fn(),
    });
    const mockJob = {
      _id: JOB_ID,
      title: 'Test Job',
      status: 'completed',
      assignedTo: FIXER_ID,
      createdBy: HIRER_ID,
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValue(mockJob);
    (resolveJobReviewContext as jest.Mock).mockReturnValue({
      reviewerRole: 'hirer',
      revieweeId: FIXER_ID,
      completionTarget: 'fixerRating',
      legacyReviewType: 'hirer_to_fixer',
      publicReviewType: 'client_to_fixer',
    });
    (hasExistingCompletionReview as jest.Mock).mockReturnValue(false);
    (hasCanonicalReviewForJob as jest.Mock).mockResolvedValue(false);
    (createCanonicalReview as jest.Mock).mockResolvedValue({ reviewId: 'review-123' });
    (submitJobCompletionReview as jest.Mock).mockResolvedValue(undefined);
    (refreshRevieweeAggregateRating as jest.Mock).mockResolvedValue(undefined);
    (getCompletionReviewStatus as jest.Mock).mockReturnValue({ bothReviewsComplete: false });

    const response = await postReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/review`, {
        rating: 4,
        review: 'Very professional and timely',
      }),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
  });
});

describe('GET /api/jobs/[jobId]/review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when job not found', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    const response = await getReview(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/review`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 with review data', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: JOB_ID,
        completion: {
          fixerRating: { rating: 4, review: 'Great', ratedAt: new Date() },
          hirerRating: null,
          reviewStatus: 'partial',
        },
      }),
    });

    const response = await getReview(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/review`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.reviews).toBeDefined();
  });
});

// ── /api/jobs/[jobId]/reviews (GET + POST) ────────────────────────────────────

describe('GET /api/jobs/[jobId]/reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseQuery as jest.Mock).mockReturnValue({ data: { page: 1, limit: 20 } });
  });

  it('returns 200 with reviews list', async () => {
    (listJobReviews as jest.Mock).mockResolvedValue({
      items: [{ _id: 'rev1', rating: 5, comment: 'Excellent' }],
      total: 1,
    });

    const response = (await listReviews(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/reviews`) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it('returns 200 with empty list when no reviews', async () => {
    (listJobReviews as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    const response = (await listReviews(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/reviews`) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data)).toBe(true);
  });
});

describe('POST /api/jobs/[jobId]/reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (requireSessionAuth as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({
      data: { rating: 4, comment: 'Great work done very professionally' },
    });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    (requireSessionAuth as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = (await createReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/reviews`, {
        rating: 4,
        comment: 'Great work done professionally',
      }) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    expect(response.status).toBe(401);
  });

  it('returns 422 on validation failure (no comment)', async () => {
    (parseBody as jest.Mock).mockResolvedValue({
      data: { rating: 4 },
    });

    const response = (await createReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/reviews`, {
        rating: 4,
      }) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    expect(response.status).toBe(422);
  });

  it('returns 404 when job not found', async () => {
    (createJobReview as jest.Mock).mockRejectedValue(new Error('Job not found'));

    const response = (await createReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/reviews`, {
        rating: 4,
        comment: 'Great work done very professionally',
      }) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    expect(response.status).toBe(404);
  });

  it('returns 201 on successful review creation', async () => {
    (createJobReview as jest.Mock).mockResolvedValue({
      _id: 'review-123',
      rating: 4,
      comment: 'Great work',
    });

    const response = (await createReview(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/reviews`, {
        rating: 4,
        comment: 'Great work done very professionally',
      }) as NextRequest,
      { params: Promise.resolve({ jobId: JOB_ID }) }
    )) as Response;
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
  });
});

// ── /api/jobs/[jobId]/reviews/status (GET) ────────────────────────────────────

describe('GET /api/jobs/[jobId]/reviews/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession('hirer') });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    (requireSession as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await getReviewStatus(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/reviews/status`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 404 when job not found', async () => {
    // The route calls Job.findById().populate('createdBy', ...).populate('assignedTo', ...)
    // No lean — it awaits the chain directly. Mock must resolve to null at the end of two populates.
    (Job.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      }),
    });

    const response = await getReviewStatus(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/reviews/status`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 when user is not a participant', async () => {
    const mockJob = {
      _id: JOB_ID,
      createdBy: { _id: 'other-hirer', toString: () => 'other-hirer' },
      assignedTo: { _id: 'other-fixer', toString: () => 'other-fixer' },
      status: 'completed',
      getReviewStatusForUI: jest.fn().mockReturnValue({ canReview: false }),
      getJobParticipants: jest.fn().mockReturnValue({ hirer: 'other-hirer', fixer: 'other-fixer' }),
      completion: {},
    };
    // The route calls Job.findById().populate('createdBy', ...).populate('assignedTo', ...)
    // and awaits the chain — must resolve to mockJob via the two-populate chain.
    (Job.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockJob),
      }),
    });

    const response = await getReviewStatus(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/reviews/status`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    expect(response.status).toBe(403);
  });

  it('returns 200 with review status for hirer', async () => {
    const mockJob = {
      _id: JOB_ID,
      createdBy: { _id: HIRER_ID, toString: () => HIRER_ID },
      assignedTo: { _id: FIXER_ID, toString: () => FIXER_ID },
      status: 'completed',
      title: 'Test Job',
      getReviewStatusForUI: jest.fn().mockReturnValue({
        canReview: true,
        hasReviewed: false,
        awaitingOtherReview: false,
        bothReviewsComplete: false,
      }),
      getJobParticipants: jest.fn().mockReturnValue({
        hirer: { id: HIRER_ID, name: 'Hirer' },
        fixer: { id: FIXER_ID, name: 'Fixer' },
      }),
      completion: {
        hirerRating: null,
        fixerRating: null,
        confirmedAt: null,
        messagingClosed: false,
      },
    };
    // The route calls Job.findById().populate('createdBy', ...).populate('assignedTo', ...)
    // Must use a two-level populate chain that resolves to mockJob.
    (Job.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockJob),
      }),
    });

    const response = await getReviewStatus(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/reviews/status`),
      { params: Promise.resolve({ jobId: JOB_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.reviewStatus).toBeDefined();
  });
});
