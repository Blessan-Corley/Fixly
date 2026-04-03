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

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    invalidatePattern: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/ably/events', () => ({
  Channels: {
    job: (id: string) => `job:${id}`,
    user: (id: string) => `private:user:${id}`,
  },
  Events: {
    job: { applicationSubmitted: 'application.submitted' },
    user: { notificationSent: 'notification.sent' },
  },
}));

jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/validations/content-policy', () => ({
  moderateUserGeneratedContent: jest.fn().mockResolvedValue({ allowed: true }),
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
  countActiveApplicationsOnJob: jest.fn().mockReturnValue(1),
}));

jest.mock('@/app/api/jobs/[jobId]/job-route-utils', () => ({
  invalidateJobReadCaches: jest.fn().mockResolvedValue(undefined),
  sanitizeString: (v: unknown) => (typeof v === 'string' ? v.trim() : ''),
  toIdString: (v: unknown) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && '_id' in (v as Record<string, unknown>)) {
      return String((v as Record<string, unknown>)._id);
    }
    return String(v);
  },
}));

jest.mock('@/app/api/jobs/[jobId]/realtime', () => ({
  publishJobCountsUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/api/jobs/[jobId]/route.shared', () => ({
  getValidatedJobId: jest.fn(),
  CACHE_HEADERS: { PRIVATE_NO_STORE: 'no-store' },
  withCacheControl: (res: Response) => res,
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/jobs/[jobId]/apply/route';
import { getValidatedJobId } from '@/app/api/jobs/[jobId]/route.shared';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/jobs/[jobId]/apply', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const hirerId = '507f1f77bcf86cd799439011';
  const fixerId = '507f1f77bcf86cd799439022';

  const makeFixerUser = (overrides: Record<string, unknown> = {}) => ({
    _id: fixerId,
    name: 'Test Fixer',
    role: 'fixer',
    banned: false,
    plan: { type: 'free', creditsUsed: 0 },
    canApply: jest.fn(() => true),
    ...overrides,
  });

  const makeJobDoc = (overrides: Record<string, unknown> = {}) => {
    const applicationId = '507f1f77bcf86cd799439099';
    const newApplication = {
      _id: applicationId,
      proposedAmount: 500,
      priceVariance: 0,
      priceVariancePercentage: 0,
      timeEstimate: null,
      status: 'pending',
      appliedAt: new Date(),
      description: 'I can fix this quickly and efficiently within 2 days',
      negotiationNotes: '',
    };

    const applications: unknown[] = [];
    const originalPush = applications.push.bind(applications);
    applications.push = jest.fn((...args: unknown[]) => {
      originalPush(newApplication);
      return applications.length;
    }) as typeof applications.push;

    return {
      _id: jobId,
      title: 'Fix my pipes',
      status: 'open',
      createdBy: { _id: hirerId, name: 'Hirer', email: 'hirer@example.com', preferences: {} },
      budget: { type: 'negotiable', amount: null },
      deadline: null,
      applications,
      canApply: jest.fn(() => true),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({
      success: true,
      remainingAttempts: 10,
      resetTime: Date.now() + 3_600_000,
    });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: fixerId,
        name: 'Test Fixer',
        role: 'fixer',
        csrfToken: TEST_CSRF_TOKEN,
      },
    });
    (getValidatedJobId as jest.Mock).mockReturnValue({ ok: true, jobId });
    (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({ allowed: true });
  });

  // ─── POST ───────────────────────────────────────────────────────────────────

  describe('POST (apply to job)', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBe('Authentication required');
    });

    it('returns 403 when CSRF token does not match session token', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: fixerId,
          name: 'Test Fixer',
          role: 'fixer',
          csrfToken: 'session-token-that-will-not-match-any-request-header',
        },
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': 'completely-different-wrong-csrf-token' },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      (rateLimit as jest.Mock).mockResolvedValue({
        success: false,
        remainingAttempts: 0,
        resetTime: Date.now() + 3_600_000,
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(429);
    });

    it('returns 403 when a hirer tries to apply (fixers only)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: hirerId,
          name: 'Hirer User',
          role: 'hirer',
          csrfToken: TEST_CSRF_TOKEN,
        },
      });

      const hirerDoc = { _id: hirerId, role: 'hirer', banned: false };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(hirerDoc) }),
      });

      const job = makeJobDoc();
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(403);
      expect(payload.message ?? payload.error).toMatch(/fixer/i);
    });

    it('returns 404 when job does not exist', async () => {
      const fixer = makeFixerUser();
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(404);
      expect(payload.message ?? payload.error).toMatch(/job/i);
    });

    it('returns 400 when applying to a non-open job', async () => {
      const fixer = makeFixerUser();
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });

      const closedJob = makeJobDoc({ status: 'in_progress' });
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(closedJob),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toMatch(/no longer accepting/i);
    });

    it('returns 400 when the fixer has already applied (canApply returns false)', async () => {
      const fixer = makeFixerUser({ canApply: jest.fn(() => false) });
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });

      const job = makeJobDoc({ canApply: jest.fn(() => false) });
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toMatch(/cannot apply/i);
    });

    it('returns 400 when description is too short (under 20 chars)', async () => {
      const fixer = makeFixerUser();
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });

      const job = makeJobDoc();
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ proposedAmount: 500, description: 'Too short' }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toMatch(/20 characters/i);
    });

    it('returns 400 when proposedAmount is missing or zero', async () => {
      const fixer = makeFixerUser();
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });

      const job = makeJobDoc();
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 0,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toMatch(/proposed amount/i);
    });

    it('applies successfully with valid data', async () => {
      const fixer = makeFixerUser();
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });

      const job = makeJobDoc();
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(201);
      expect(payload.success).toBe(true);
      expect(payload.application).toBeDefined();
    });

    it('returns 400 when content moderation flags the description', async () => {
      const fixer = makeFixerUser();
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });

      const job = makeJobDoc();
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({
        allowed: false,
        message: 'Content violates policy',
        violations: [{ type: 'spam', severity: 'medium', text: 'call me at 9999999999' }],
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 500,
            description: 'Call me at 9999999999 for this job work immediately',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.violations).toBeDefined();
    });

    it('returns 400 when proposedAmount deviates more than 50% from fixed budget', async () => {
      const fixer = makeFixerUser();
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
      });

      const job = makeJobDoc({ budget: { type: 'fixed', amount: 1000 } });
      (Job.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(job),
      });

      const response = await POST(
        new Request(`http://localhost/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            proposedAmount: 200, // 80% below budget — exceeds 50% variance
            description: 'I can fix this quickly and efficiently within 2 days',
          }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.suggestedRange).toBeDefined();
    });
  });
});
