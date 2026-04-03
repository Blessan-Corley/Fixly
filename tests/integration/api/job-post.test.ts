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
  default: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined),
    _id: '507f1f77bcf86cd799439099',
    title: 'Fix plumbing issue now',
    status: 'open',
    featured: false,
    createdAt: new Date(),
    location: { city: 'Mumbai', state: 'Maharashtra' },
  })),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/ably/events', () => ({
  Channels: {
    marketplace: 'marketplace:listings',
  },
  Events: {
    marketplace: {
      jobPosted: 'job.posted',
    },
  },
}));

jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/security/csrf.server', () => ({
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn((session: { user?: { csrfToken?: string } } | null) =>
    session?.user?.csrfToken ?? null
  ),
  validateCsrfToken: jest.fn(
    (
      request: Request,
      session: { user?: { csrfToken?: string } } | null
    ) => {
      const headerToken = request.headers.get('x-csrf-token');
      const sessionToken = session?.user?.csrfToken;
      if (!sessionToken) return { valid: false, reason: 'MISSING_SESSION_TOKEN' };
      if (!headerToken) return { valid: false, reason: 'MISSING_HEADER_TOKEN' };
      return headerToken === sessionToken ? { valid: true } : { valid: false, reason: 'TOKEN_MISMATCH' };
    }
  ),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    invalidatePattern: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('@/lib/redisCache', () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  withCache: jest.fn(),
}));

jest.mock('@/lib/services/jobs/createJob', () => ({
  createJob: jest.fn(),
}));

jest.mock('@/lib/services/jobs/job.mutations', () => ({
  getJobPostingCooldownError: jest.fn(() => null),
  prepareJobPostPayload: jest.fn(),
}));

jest.mock('@/lib/services/jobs/job.queries', () => ({
  listJobsForUser: jest.fn(),
  markExpiredJobsForUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/jobs/job.mapper', () => ({
  mapListedJobs: jest.fn((jobs: unknown[]) => jobs),
  buildCreateJobInput: jest.fn((data: unknown) => data),
}));

jest.mock('@/lib/services/jobPostSideEffects', () => ({
  runJobPostSideEffects: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/jobs/jobModeration', () => ({
  moderateJobContent: jest.fn().mockResolvedValue({ approved: true }),
  moderateJobSkills: jest.fn().mockResolvedValue({ approved: true }),
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/jobs/post/route';
import { createJob } from '@/lib/services/jobs/createJob';
import { prepareJobPostPayload } from '@/lib/services/jobs/job.mutations';
import User from '@/models/User';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

function sessionWithMismatchedCsrf(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: {
      id: `test-user-${role}-id`,
      email: `test-${role}@example.com`,
      role,
      csrfToken: 'a'.repeat(64),
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

describe('/api/jobs/post', () => {
  const hirerId = '507f1f77bcf86cd799439011';
  const fixerId = '507f1f77bcf86cd799439022';
  const newJobId = '507f1f77bcf86cd799439099';

  const validJobBody = {
    title: 'Fix plumbing issue now',
    description: 'The kitchen pipe is leaking badly and needs urgent repair.',
    location: {
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    budget: { type: 'fixed', amount: 5000 },
    urgency: 'asap',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [{ url: 'https://example.com/photo.jpg', isImage: true }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify(validJobBody),
      })
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 for CSRF failure (mismatched token)', async () => {
    // Session CSRF token doesn't match the auto-attached TEST_CSRF_TOKEN
    (getServerSession as jest.Mock).mockResolvedValue(sessionWithMismatchedCsrf('hirer'));

    const response = await POST(
      new Request('http://localhost/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validJobBody),
      })
    );

    expect(response.status).toBe(403);
  });

  it('returns 403 when fixer tries to post a job', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const fixer = { _id: fixerId, role: 'fixer', banned: false };
    (User.findById as jest.Mock).mockResolvedValue(fixer);

    const response = await POST(
      new Request('http://localhost/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify(validJobBody),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error?.message ?? payload.message).toBeDefined();
  });

  it('returns 400 for missing required fields (no title)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const hirer = {
      _id: hirerId,
      role: 'hirer',
      banned: false,
      plan: { type: 'free', status: 'active' },
      canPostJob: () => true,
    };
    (User.findById as jest.Mock).mockResolvedValue(hirer);

    (prepareJobPostPayload as jest.Mock).mockResolvedValue({
      error: {
        body: {
          success: false,
          message: 'Missing required fields: title, description, location, and at least 1 photo are required',
        },
        status: 400,
      },
    });

    const bodyWithoutTitle = { ...validJobBody, title: '' };

    const response = await POST(
      new Request('http://localhost/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify(bodyWithoutTitle),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBeDefined();
  });

  it('returns 400 for title too short', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const hirer = {
      _id: hirerId,
      role: 'hirer',
      banned: false,
      plan: { type: 'free', status: 'active' },
      canPostJob: () => true,
    };
    (User.findById as jest.Mock).mockResolvedValue(hirer);

    (prepareJobPostPayload as jest.Mock).mockResolvedValue({
      error: {
        body: {
          success: false,
          message: 'Job title must be at least 10 characters',
        },
        status: 400,
      },
    });

    const bodyWithShortTitle = { ...validJobBody, title: 'Short' };

    const response = await POST(
      new Request('http://localhost/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify(bodyWithShortTitle),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('10 characters');
  });

  it('creates job successfully with valid data', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const hirer = {
      _id: hirerId,
      role: 'hirer',
      banned: false,
      plan: { type: 'free', status: 'active' },
      canPostJob: () => true,
    };
    (User.findById as jest.Mock).mockResolvedValue(hirer);

    const jobData = {
      title: validJobBody.title,
      description: validJobBody.description,
      location: validJobBody.location,
      budget: validJobBody.budget,
      urgency: validJobBody.urgency,
    };

    (prepareJobPostPayload as jest.Mock).mockResolvedValue({
      jobData,
      draftId: '',
    });

    const createdJob = {
      _id: { toString: () => newJobId },
      title: validJobBody.title,
      status: 'open',
      featured: false,
      createdAt: new Date(),
      location: validJobBody.location,
    };
    (createJob as jest.Mock).mockResolvedValue(createdJob);

    const response = await POST(
      new Request('http://localhost/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': TEST_CSRF_TOKEN },
        body: JSON.stringify(validJobBody),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    // success response is wrapped: { success: true, data: { jobId, message } }
    expect(payload.data?.jobId ?? payload.jobId).toBe(newJobId);
    expect(payload.data?.message ?? payload.message).toBeDefined();
    expect(createJob).toHaveBeenCalled();
  });
});
