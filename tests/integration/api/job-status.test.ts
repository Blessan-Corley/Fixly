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

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/job/workflow', () => ({
  acceptApplicationOnJob: jest.fn(),
  cancelJobOnJob: jest.fn(),
  markDoneOnJob: jest.fn(),
}));

jest.mock('@/lib/services/automatedMessaging', () => ({
  sendWorkStatusMessage: jest.fn(),
  sendDisputeMessage: jest.fn(),
}));

jest.mock('@/lib/disputes/state', () => ({
  createDisputeRecord: jest.fn(),
  findActiveDisputeForJob: jest.fn(),
}));

jest.mock('@/app/api/jobs/[jobId]/job-route-utils', () => {
  const actual = jest.requireActual('@/app/api/jobs/[jobId]/job-route-utils');
  return {
    ...actual,
    invalidateJobReadCaches: jest.fn(),
    notifyUser: jest.fn(),
  };
});

jest.mock('@/lib/ably', () => ({
  CHANNELS: {
    jobUpdates: jest.fn((jobId: string) => `job:${jobId}:updates`),
  },
  EVENTS: {
    JOB_STATUS_CHANGED: 'job_status_changed',
  },
  getServerAbly: jest.fn(() => ({
    channels: {
      get: jest.fn(() => ({
        publish: jest.fn().mockResolvedValue(undefined),
      })),
    },
  })),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { invalidateJobReadCaches, notifyUser } from '@/app/api/jobs/[jobId]/job-route-utils';
import { PUT } from '@/app/api/jobs/[jobId]/status/route';
import { sendWorkStatusMessage } from '@/lib/services/automatedMessaging';
import { ContentValidator } from '@/lib/validations/content-validator';
import Job from '@/models/Job';
import { markDoneOnJob } from '@/models/job/workflow';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/jobs/[jobId]/status', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const fixerId = '507f1f77bcf86cd799439011';
  const hirerId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: fixerId,
        role: 'fixer',
        name: 'Fixer User',
      },
    });
    (User.findById as jest.Mock).mockResolvedValue({
      _id: fixerId,
      role: 'fixer',
      name: 'Fixer User',
    });
  });

  it('blocks abusive completion notes before workflow mutation', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const query = {
      status: 'in_progress',
      title: 'Pipe repair',
      createdBy: { _id: hirerId },
      assignedTo: { _id: fixerId },
      applications: [],
      progress: { startedAt: new Date('2025-01-01T10:00:00.000Z') },
      budget: { amount: 2500 },
      createdAt: new Date('2025-01-01T09:00:00.000Z'),
      updatedAt: new Date('2025-01-01T10:30:00.000Z'),
      save,
      populate: jest.fn(),
    };
    query.populate.mockReturnValue(query);
    (Job.findById as jest.Mock).mockReturnValue(query);

    const response = await PUT(
      new Request(`http://localhost/api/jobs/${jobId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          newStatus: 'completed',
          completionNotes: 'You are an idiot',
        }),
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Completion notes');
    expect(markDoneOnJob).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('completes the job and triggers side effects for a valid fixer transition', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const job = {
      _id: jobId,
      status: 'in_progress',
      title: 'Pipe repair',
      createdBy: { _id: hirerId },
      assignedTo: { _id: fixerId },
      applications: [],
      progress: { startedAt: new Date('2025-01-01T10:00:00.000Z') },
      completion: {},
      budget: { amount: 2500 },
      createdAt: new Date('2025-01-01T09:00:00.000Z'),
      updatedAt: new Date('2025-01-01T10:30:00.000Z'),
      save,
      populate: jest.fn(),
    };
    const query = Object.assign({}, job);
    query.populate = jest.fn().mockReturnValue(query);
    (Job.findById as jest.Mock).mockReturnValue(query);
    (markDoneOnJob as jest.Mock).mockImplementation(
      (
        jobArg: typeof job & {
          progress?: Record<string, unknown>;
          completion?: Record<string, unknown>;
          status: string;
        },
        actorId: string,
        notes: string,
        _photos: unknown[],
        now: Date
      ) => {
        jobArg.status = 'completed';
        jobArg.progress = {
          ...(jobArg.progress || {}),
          completedAt: now,
        };
        jobArg.completion = {
          ...(jobArg.completion || {}),
          markedDoneBy: actorId,
          completionNotes: notes,
        };
        return { ok: true };
      }
    );

    const response = await PUT(
      new Request(`http://localhost/api/jobs/${jobId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          newStatus: 'completed',
          completionNotes: 'Finished and verified',
        }),
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.job.status).toBe('completed');
    expect(markDoneOnJob).toHaveBeenCalled();
    expect(notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ _id: hirerId }),
      'job_completed',
      'Job completed',
      expect.stringContaining('Pipe repair'),
      expect.objectContaining({ jobId })
    );
    expect(save).toHaveBeenCalled();
    expect(invalidateJobReadCaches).toHaveBeenCalledWith(jobId);
    expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    expect(sendWorkStatusMessage).toHaveBeenCalledWith(jobId, 'completed');
  });
});
