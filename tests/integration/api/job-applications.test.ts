// Phase 2: Stabilized application acceptance integration coverage after response and CSRF fixes.
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
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
    findById: jest.fn(),
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
}));

jest.mock('@/lib/services/messageService', () => ({
  MessageService: {
    createJobConversation: jest.fn(),
  },
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/api/jobs/[jobId]/job-route-utils', () => ({
  invalidateJobReadCaches: jest.fn(),
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

import { startSession } from 'mongoose';
import { getServerSession } from 'next-auth/next';

import { GET, PUT } from '@/app/api/jobs/[jobId]/applications/route';
import { invalidateJobReadCaches } from '@/app/api/jobs/[jobId]/job-route-utils';
import { publishToChannel } from '@/lib/ably/publisher';
import { MessageService } from '@/lib/services/messageService';
import { ContentValidator } from '@/lib/validations/content-validator';
import Job from '@/models/Job';
import { acceptApplicationOnJob } from '@/models/job/workflow';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/jobs/[jobId]/applications', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const hirerId = '507f1f77bcf86cd799439011';
  const fixerId = '507f1f77bcf86cd799439022';
  const otherFixerId = '507f1f77bcf86cd799439033';
  const applicationId = '507f1f77bcf86cd799439044';
  const otherApplicationId = '507f1f77bcf86cd799439055';

  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: hirerId,
        name: 'Hirer User',
        role: 'hirer',
        csrfToken: TEST_CSRF_TOKEN,
      },
    });
  });

  it('requires authentication to fetch applications', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/jobs/${jobId}/applications`, {
        method: 'GET',
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });

  it('blocks abusive response messages before mutating an application', async () => {
    const response = await PUT(
      new Request(`http://localhost/api/jobs/${jobId}/applications`, {
        method: 'PUT',
        body: JSON.stringify({
          applicationId,
          status: 'accepted',
          message: 'You are an idiot',
        }),
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Application response');
    expect(Job.findById).not.toHaveBeenCalled();
  });

  it('accepts a valid application and triggers the canonical side effects', async () => {
    const dbSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };
    (startSession as jest.Mock).mockResolvedValue(dbSession);

    const acceptedApplication = {
      _id: applicationId,
      fixer: fixerId,
      status: 'pending',
    };
    const otherApplication = {
      _id: otherApplicationId,
      fixer: otherFixerId,
      status: 'pending',
    };

    const initialJob = {
      _id: jobId,
      title: 'Pipe repair',
      status: 'open',
      createdBy: hirerId,
      applications: {
        id: jest.fn((id: string) => (id === applicationId ? acceptedApplication : null)),
      },
    };

    const txJob = {
      _id: jobId,
      title: 'Pipe repair',
      status: 'open',
      createdBy: hirerId,
      applications: [acceptedApplication, otherApplication],
      save: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(txJob.applications, {
      id: jest.fn((id: string) => (id === applicationId ? acceptedApplication : null)),
    });

    (Job.findById as jest.Mock).mockResolvedValueOnce(initialJob).mockReturnValueOnce({
      session: jest.fn().mockResolvedValue(txJob),
    });

    const acceptedFixer = {
      _id: fixerId,
      plan: { type: 'free', status: 'active', creditsUsed: 0 },
      canBeAssignedJob: jest.fn(() => true),
      save: jest.fn().mockResolvedValue(undefined),
      addNotification: jest.fn().mockResolvedValue(undefined),
    };
    const acceptedFixerDoc = {
      session: jest.fn().mockResolvedValue(acceptedFixer),
      addNotification: acceptedFixer.addNotification,
    };

    const rejectedNotificationRecipient = {
      addNotification: jest.fn().mockResolvedValue(undefined),
    };

    (User.findById as jest.Mock).mockImplementation((id: string) => {
      if (id === fixerId) {
        return acceptedFixerDoc;
      }

      if (id === otherFixerId) {
        return rejectedNotificationRecipient;
      }

      return null;
    });

    (acceptApplicationOnJob as jest.Mock).mockReturnValue({ ok: true });

    const response = await PUT(
      new Request(`http://localhost/api/jobs/${jobId}/applications`, {
        method: 'PUT',
        body: JSON.stringify({
          applicationId,
          status: 'accepted',
          message: 'Please start tomorrow morning',
        }),
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(dbSession.startTransaction).toHaveBeenCalled();
    expect(dbSession.commitTransaction).toHaveBeenCalled();
    expect(acceptApplicationOnJob).toHaveBeenCalledWith(txJob, applicationId, expect.any(Date));
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: acceptedFixer._id },
      { $inc: { 'plan.creditsUsed': 1 } },
      { session: dbSession }
    );
    expect(txJob.save).toHaveBeenCalledWith({ session: dbSession });
    expect(MessageService.createJobConversation).toHaveBeenCalledWith(jobId, hirerId, fixerId);
    expect(invalidateJobReadCaches).toHaveBeenCalledWith(jobId);
    expect(publishToChannel).toHaveBeenCalledTimes(3);
  }, 15000);
});
