jest.mock('mongoose', () => {
  function ObjectId(this: void, id: string) { return id; }
  ObjectId.isValid = jest.fn(
    (value: string) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
  );
  return {
    Types: { ObjectId },
    startSession: jest.fn(),
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
  rateLimit: jest.fn(),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    aggregate: jest.fn(),
    populate: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
}));

jest.mock('@/models/job/workflow', () => ({
  acceptApplicationOnJob: jest.fn(),
  cancelJobOnJob: jest.fn(),
  countActiveApplicationsOnJob: jest.fn(() => 0),
}));

jest.mock('@/lib/ably', () => ({
  CHANNELS: {
    jobUpdates: jest.fn((jobId: string) => `job:${jobId}:updates`),
  },
  EVENTS: {
    JOB_STATUS_CHANGED: 'job_status_changed',
    APPLICATION_ACCEPTED: 'application_accepted',
    JOB_ASSIGNED: 'job_assigned',
  },
  getServerAbly: jest.fn(() => ({
    channels: {
      get: jest.fn(() => ({
        publish: jest.fn().mockResolvedValue(undefined),
      })),
    },
  })),
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
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

jest.mock('@/app/api/jobs/[jobId]/job-route-utils', () => {
  const actual = jest.requireActual('@/app/api/jobs/[jobId]/job-route-utils');
  return {
    ...actual,
    invalidateJobReadCaches: jest.fn().mockResolvedValue(undefined),
    notifyUser: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@/app/api/jobs/[jobId]/actions/realtime', () => ({
  EVENTS: {
    APPLICATION_ACCEPTED: 'application_accepted',
    JOB_ASSIGNED: 'job_assigned',
  },
  publishApplicationRealtimeEvent: jest.fn().mockResolvedValue(undefined),
  publishJobLifecycleRealtimeEvent: jest.fn().mockResolvedValue(undefined),
  publishUserRealtimeNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/api/jobs/[jobId]/realtime', () => ({
  publishJobCountsUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/api/jobs/[jobId]/status/status-helpers', () => ({
  publishJobStatusUpdate: jest.fn().mockResolvedValue(undefined),
}));

import { startSession } from 'mongoose';
import { getServerSession } from 'next-auth/next';

import { DELETE, GET, PUT } from '@/app/api/jobs/[jobId]/route';
import { invalidateJobReadCaches } from '@/app/api/jobs/[jobId]/job-route-utils';
import { publishToChannel } from '@/lib/ably/publisher';
import Job from '@/models/Job';
import { acceptApplicationOnJob, cancelJobOnJob } from '@/models/job/workflow';
import User from '@/models/User';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

// Session with a different CSRF token to trigger CSRF validation failure
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

describe('/api/jobs/[jobId]', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const hirerId = '507f1f77bcf86cd799439011';
  const fixerId = '507f1f77bcf86cd799439022';
  const applicationId = '507f1f77bcf86cd799439044';

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  // ──────────────────────────── GET ────────────────────────────

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await GET(
        new Request(`http://localhost/api/jobs/${jobId}`),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBeDefined();
    });

    it('returns 429 when rate limited', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
      (rateLimit as jest.Mock).mockResolvedValue({ success: false });

      const response = await GET(
        new Request(`http://localhost/api/jobs/${jobId}`),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(429);
    });

    it('returns 404 when job not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: hirerId,
            role: 'hirer',
            plan: { type: 'free', creditsUsed: 0 },
          }),
        }),
      });
      (Job.aggregate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const response = await GET(
        new Request(`http://localhost/api/jobs/${jobId}`),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(404);
      expect(payload.error).toBeDefined();
    });

    it('returns full job details for the job creator (hirer)', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

      const hirer = { _id: hirerId, role: 'hirer', plan: { type: 'free', creditsUsed: 0 } };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(hirer),
        }),
      });

      const job = {
        _id: jobId,
        title: 'Fix plumbing',
        description: 'Pipe burst in kitchen',
        status: 'open',
        createdBy: { _id: hirerId, name: 'Hirer User', rating: 4.5 },
        assignedTo: null,
        applications: [],
        budget: { type: 'fixed', amount: 5000 },
        location: { city: 'Mumbai', state: 'Maharashtra' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Job.aggregate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ ...job, commentCount: 0 }]),
      });
      (Job.populate as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(
        new Request(`http://localhost/api/jobs/${jobId}`),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.job).toBeDefined();
      expect(payload.job.title).toBe('Fix plumbing');
    });

    it('returns restricted view for fixer with >=3 credits used', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

      const fixer = {
        _id: fixerId,
        role: 'fixer',
        plan: { type: 'free', creditsUsed: 3 },
        skills: [],
        location: { city: 'Delhi' },
      };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(fixer),
        }),
      });

      const job = {
        _id: jobId,
        title: 'Fix plumbing',
        description: 'A '.repeat(120),
        status: 'open',
        createdBy: { _id: hirerId, name: 'Hirer', rating: 4.0 },
        assignedTo: null,
        applications: [],
        budget: { type: 'fixed', amount: 8000 },
        location: { city: 'Mumbai', state: 'Maharashtra' },
        skillsRequired: ['plumbing'],
        createdAt: new Date(),
      };

      (Job.aggregate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ ...job, commentCount: 0 }]),
      });
      (Job.populate as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(
        new Request(`http://localhost/api/jobs/${jobId}`),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.job.restrictedView).toBe(true);
    });

    it('returns full view for fixer with pro plan', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

      const fixer = {
        _id: fixerId,
        role: 'fixer',
        plan: { type: 'pro', creditsUsed: 10 },
        skills: ['plumbing'],
        location: { city: 'Mumbai' },
      };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(fixer),
        }),
      });

      const job = {
        _id: jobId,
        title: 'Fix plumbing',
        description: 'Pipe burst in kitchen',
        status: 'open',
        createdBy: { _id: hirerId, name: 'Hirer', rating: 4.0 },
        assignedTo: null,
        applications: [],
        budget: { type: 'fixed', amount: 5000 },
        location: { city: 'Mumbai', state: 'Maharashtra' },
        skillsRequired: ['plumbing'],
        createdAt: new Date(),
      };

      (Job.aggregate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ ...job, commentCount: 0 }]),
      });
      (Job.populate as jest.Mock).mockResolvedValue(undefined);

      const response = await GET(
        new Request(`http://localhost/api/jobs/${jobId}`),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.job.restrictedView).toBeUndefined();
    });
  });

  // ──────────────────────────── PUT ────────────────────────────

  describe('PUT', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await PUT(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ action: 'cancel_job', data: {} }),
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(401);
    });

    it('returns 403 for CSRF failure (mismatched token)', async () => {
      // Use a session whose csrfToken differs from the auto-attached TEST_CSRF_TOKEN
      (getServerSession as jest.Mock).mockResolvedValue(sessionWithMismatchedCsrf('hirer'));

      const response = await PUT(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'PUT',
          body: JSON.stringify({ action: 'cancel_job', data: {} }),
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(403);
    });

    it('returns 403 when a fixer tries a creator-only action', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

      const fixer = { _id: fixerId, role: 'fixer' };
      (User.findById as jest.Mock).mockResolvedValue(fixer);

      const job = {
        _id: jobId,
        status: 'open',
        createdBy: hirerId,
        assignedTo: null,
      };
      (Job.findById as jest.Mock).mockResolvedValue(job);

      const response = await PUT(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ action: 'cancel_job', data: {} }),
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(403);
      expect(payload.error).toBeDefined();
    });

    it('returns 404 when job not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

      const hirer = { _id: hirerId, role: 'hirer' };
      (User.findById as jest.Mock).mockResolvedValue(hirer);
      (Job.findById as jest.Mock).mockResolvedValue(null);

      const response = await PUT(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ action: 'cancel_job', data: {} }),
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(404);
    });

    it('dispatches accept_application action for job creator', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

      const hirer = { _id: hirerId, role: 'hirer' };

      const application = { _id: applicationId, fixer: fixerId, status: 'pending' };
      const job = {
        _id: jobId,
        status: 'open',
        createdBy: hirerId,
        assignedTo: null,
        title: 'Fix plumbing',
        applications: [application],
      };
      Object.assign(job.applications, { id: jest.fn(() => application) });

      const fixer = { _id: fixerId, name: 'Fixer User', plan: { type: 'free', status: 'active', creditsUsed: 0 } };

      // dbSession mock — used by accept-application.ts startSession()
      const dbSession = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        abortTransaction: jest.fn().mockResolvedValue(undefined),
        endSession: jest.fn().mockResolvedValue(undefined),
        inTransaction: jest.fn().mockReturnValue(false),
      };
      (startSession as jest.Mock).mockResolvedValue(dbSession);

      // txJob is what Job.findById(...).session(dbSession) returns inside the transaction
      const txJob = { ...job, status: 'in_progress', save: jest.fn().mockResolvedValue(undefined) };

      // Job.findById is called 3 times:
      //   1. handlers/put.ts — plain await Job.findById(jobId)
      //   2. accept-application.ts — Job.findById(job._id).session(dbSession) → txJob
      //   3. accept-application.ts — Job.findById(job._id).populate('assignedTo', ...)
      (Job.findById as jest.Mock)
        .mockResolvedValueOnce(job)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(txJob) })
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue({
            ...job,
            assignedTo: { _id: fixerId, name: 'Fixer', username: 'fixer', photoURL: '', rating: 4 },
          }),
        });

      // User.findById is called 2 times:
      //   1. handlers/put.ts — plain await User.findById(userId) → hirer
      //   2. accept-application.ts — User.findById(fixerId).select(...).lean() → fixer
      (User.findById as jest.Mock)
        .mockResolvedValueOnce(hirer)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(fixer) }),
        });

      (acceptApplicationOnJob as jest.Mock).mockReturnValue({
        ok: true,
        value: { _id: applicationId, fixer: fixerId, status: 'accepted' },
      });

      const response = await PUT(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ action: 'accept_application', data: { applicationId } }),
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(200);
      expect(acceptApplicationOnJob).toHaveBeenCalled();
      expect(User.updateOne).toHaveBeenCalled();
      expect(txJob.save).toHaveBeenCalledWith({ session: dbSession });
    });

    it('dispatches cancel_job action for job creator', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

      const hirer = { _id: hirerId, role: 'hirer' };
      (User.findById as jest.Mock).mockResolvedValue(hirer);

      const job = {
        _id: jobId,
        status: 'open',
        createdBy: hirerId,
        assignedTo: null,
        title: 'Fix plumbing',
        applications: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      (Job.findById as jest.Mock).mockResolvedValue(job);

      (cancelJobOnJob as jest.Mock).mockReturnValue({ ok: true });

      const response = await PUT(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ action: 'cancel_job', data: { reason: 'Changed plans' } }),
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(200);
      expect(cancelJobOnJob).toHaveBeenCalled();
    });
  });

  // ──────────────────────────── DELETE ────────────────────────────

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(401);
    });

    it('returns 403 when user is not job creator', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

      const fixer = { _id: fixerId, role: 'fixer' };
      (User.findById as jest.Mock).mockResolvedValue(fixer);

      const job = {
        _id: jobId,
        status: 'open',
        createdBy: hirerId,
      };
      (Job.findById as jest.Mock).mockResolvedValue(job);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        }),
        { params: Promise.resolve({ jobId }) }
      );
      const payload = await response.json();

      expect(response.status).toBe(403);
      expect(payload.error).toBeDefined();
    });

    it('returns 400 when trying to delete an in_progress job', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

      const hirer = { _id: hirerId, role: 'hirer' };
      (User.findById as jest.Mock).mockResolvedValue(hirer);

      const job = {
        _id: jobId,
        status: 'in_progress',
        createdBy: hirerId,
      };
      (Job.findById as jest.Mock).mockResolvedValue(job);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(400);
    });

    it('deletes successfully when creator deletes an open job', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

      const hirer = { _id: hirerId, role: 'hirer' };
      (User.findById as jest.Mock).mockResolvedValue(hirer);

      const job = {
        _id: jobId,
        status: 'open',
        createdBy: hirerId,
      };
      (Job.findById as jest.Mock).mockResolvedValue(job);
      (Job.findByIdAndDelete as jest.Mock).mockResolvedValue(job);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        }),
        { params: Promise.resolve({ jobId }) }
      );

      expect(response.status).toBe(204);
      expect(Job.findByIdAndDelete).toHaveBeenCalledWith(jobId);
      expect(invalidateJobReadCaches).toHaveBeenCalledWith(jobId);
      expect(publishToChannel).toHaveBeenCalled();
    });
  });
});
