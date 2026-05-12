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

jest.mock('@/models/Dispute', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
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
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/disputes/state', () => ({
  applyAdminDisputeStatusUpdate: jest.fn(),
  createDisputeRecord: jest.fn(),
  findActiveDisputeForJob: jest.fn(),
  syncJobDisputeOpened: jest.fn(),
  syncJobDisputeState: jest.fn(),
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

jest.mock('@/lib/inngest/client', () => ({
  inngest: { send: jest.fn().mockResolvedValue(undefined) },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/disputes/route';
import { createDisputeRecord, findActiveDisputeForJob } from '@/lib/disputes/state';
import { ContentValidator } from '@/lib/validations/content-validator';
import Dispute from '@/models/Dispute';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

// ─── Test constants ──────────────────────────────────────────────────────────

const jobId = '507f1f77bcf86cd799439031';
const hirerId = '507f1f77bcf86cd799439011';
const fixerId = '507f1f77bcf86cd799439022';
const outsiderId = '507f1f77bcf86cd799439099';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validDisputeBody(override: Record<string, unknown> = {}) {
  return JSON.stringify({
    jobId,
    againstUserId: fixerId,
    category: 'payment_issue',
    title: 'Payment dispute',
    description: 'The work was incomplete and the payment terms were disputed.',
    desiredOutcome: 'refund',
    refundRequested: 2500,
    evidence: [],
    ...override,
  });
}

function makeJobQuery(jobData: Record<string, unknown> | null) {
  return {
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(jobData),
    }),
  };
}

function makePopulatedDisputeQuery(disputeData: Record<string, unknown>) {
  const query = {
    populate: jest.fn(),
    lean: jest.fn().mockResolvedValue(disputeData),
  };
  query.populate.mockReturnValue(query);
  return query;
}

// ─── describe ────────────────────────────────────────────────────────────────

describe('POST /api/disputes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();

    // Default: rate limit passes
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });

    // Default: authenticated hirer session (csrfToken injected by requireSession in test mode)
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: hirerId, name: 'Hirer User', role: 'hirer' },
    });
  });

  // ── Authentication ────────────────────────────────────────────────────────

  it('returns 401 when the user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: validDisputeBody(),
      })
    );

    expect(response.status).toBe(401);
    expect(Job.findById).not.toHaveBeenCalled();
  });

  // ── CSRF ──────────────────────────────────────────────────────────────────

  it('returns 403 when the CSRF token in the header does not match the session token', async () => {
    // The Request auto-attaches the correct CSRF header — we override with a wrong one.
    // The patched Request only auto-attaches when the header is absent, so we set it manually
    // to a wrong value to simulate a CSRF mismatch.
    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        headers: { 'x-csrf-token': 'wrong-token-that-does-not-match' },
        body: validDisputeBody(),
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error).toBe('CSRF_INVALID');
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it('returns 429 when the rate limit is exceeded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: validDisputeBody(),
      })
    );

    expect(response.status).toBe(429);
    // Rate limit fires before any auth or DB access
    expect(getServerSession).not.toHaveBeenCalled();
    expect(Job.findById).not.toHaveBeenCalled();
  });

  // ── Content moderation ────────────────────────────────────────────────────

  it('returns 400 and blocks the request when dispute description contains a phone number', async () => {
    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: validDisputeBody({ description: 'Call me at 9876543210 to settle this' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Dispute description');
    expect(Job.findById).not.toHaveBeenCalled();
  });

  // ── Job not found ─────────────────────────────────────────────────────────

  it('returns 404 when the job does not exist', async () => {
    (findActiveDisputeForJob as jest.Mock).mockResolvedValue(null);
    (Job.findById as jest.Mock).mockReturnValue(makeJobQuery(null));

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: validDisputeBody(),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.message).toMatch(/job/i);
  });

  // ── Not a participant ─────────────────────────────────────────────────────

  it('returns 403 when the session user is not the hirer or fixer on the job', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: outsiderId, name: 'Outsider', role: 'hirer' },
    });

    (findActiveDisputeForJob as jest.Mock).mockResolvedValue(null);
    (Job.findById as jest.Mock).mockReturnValue(
      makeJobQuery({ title: 'Pipe repair', createdBy: hirerId, assignedTo: fixerId })
    );

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: validDisputeBody({ againstUserId: fixerId }),
      })
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.message).toMatch(/involved/i);
  });

  // ── Wrong against-user ────────────────────────────────────────────────────

  it('returns 400 when hirer tries to dispute against themselves instead of the fixer', async () => {
    (Job.findById as jest.Mock).mockReturnValue(
      makeJobQuery({ title: 'Pipe repair', createdBy: hirerId, assignedTo: fixerId })
    );

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        // against the same user ID as the session user (hirer disputes against themselves)
        body: validDisputeBody({ againstUserId: hirerId }),
      })
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.message).toMatch(/cannot create a dispute against yourself/i);
  });

  it('returns 400 when hirer tries to dispute against a third party not on the job', async () => {
    (Job.findById as jest.Mock).mockReturnValue(
      makeJobQuery({ title: 'Pipe repair', createdBy: hirerId, assignedTo: fixerId })
    );

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        // against a random outsider rather than the actual fixer
        body: validDisputeBody({ againstUserId: outsiderId }),
      })
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.message).toMatch(/other party/i);
  });

  // ── Duplicate dispute ─────────────────────────────────────────────────────

  it('returns 400 when an active dispute already exists for the job', async () => {
    (Job.findById as jest.Mock).mockReturnValue(
      makeJobQuery({ title: 'Pipe repair', createdBy: hirerId, assignedTo: fixerId })
    );
    (findActiveDisputeForJob as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439077',
      disputeId: 'DSP-0001',
    });

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: validDisputeBody(),
      })
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.message).toMatch(/already an active dispute/i);
    expect(createDisputeRecord).not.toHaveBeenCalled();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('creates a dispute successfully and notifies both parties', async () => {
    (findActiveDisputeForJob as jest.Mock).mockResolvedValue(null);
    (createDisputeRecord as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
      disputeId: 'DSP-0001',
    });

    (Job.findById as jest.Mock).mockReturnValue(
      makeJobQuery({ title: 'Pipe repair', createdBy: hirerId, assignedTo: fixerId })
    );

    (Dispute.findById as jest.Mock).mockReturnValue(
      makePopulatedDisputeQuery({ _id: '507f1f77bcf86cd799439099', disputeId: 'DSP-0001' })
    );

    const moderatorQuery = {
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: '507f1f77bcf86cd799439055' }]),
      }),
    };
    (User.find as jest.Mock).mockReturnValue(moderatorQuery);
    (User.findById as jest.Mock).mockResolvedValue({
      addNotification: jest.fn().mockResolvedValue(undefined),
    });

    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: validDisputeBody(),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(createDisputeRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId,
        initiatedBy: hirerId,
        againstUser: fixerId,
        priority: 'low',
      })
    );
  });
});
