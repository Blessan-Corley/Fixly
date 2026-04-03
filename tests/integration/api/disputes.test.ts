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

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/disputes/route';
import { createDisputeRecord, findActiveDisputeForJob } from '@/lib/disputes/state';
import { ContentValidator } from '@/lib/validations/content-validator';
import Dispute from '@/models/Dispute';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/disputes', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const hirerId = '507f1f77bcf86cd799439011';
  const fixerId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: hirerId,
        name: 'Hirer User',
        role: 'hirer',
      },
    });
  });

  it('rejects prohibited content in dispute descriptions', async () => {
    const response = await POST(
      new Request('http://localhost/api/disputes', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          againstUserId: fixerId,
          category: 'payment_issue',
          title: 'Payment dispute',
          description: 'Call me at 9876543210 to settle this',
          desiredOutcome: 'refund',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Dispute description');
    expect(Job.findById).not.toHaveBeenCalled();
  });

  it('creates a dispute for the other party on the job and notifies recipients', async () => {
    (findActiveDisputeForJob as jest.Mock).mockResolvedValue(null);
    (createDisputeRecord as jest.Mock).mockResolvedValue({
      _id: '507f1f77bcf86cd799439099',
      disputeId: 'DSP-0001',
    });

    const jobQuery = {
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          title: 'Pipe repair',
          createdBy: hirerId,
          assignedTo: fixerId,
        }),
      }),
    };
    (Job.findById as jest.Mock).mockReturnValue(jobQuery);

    const populatedDisputeQuery = {
      populate: jest.fn(),
      lean: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439099',
        disputeId: 'DSP-0001',
      }),
    };
    populatedDisputeQuery.populate.mockReturnValue(populatedDisputeQuery);
    (Dispute.findById as jest.Mock).mockReturnValue(populatedDisputeQuery);

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
        body: JSON.stringify({
          jobId,
          againstUserId: fixerId,
          category: 'payment_issue',
          title: 'Payment dispute',
          description: 'The work was incomplete and the payment terms were disputed.',
          desiredOutcome: 'refund',
          refundRequested: 2500,
          evidence: [],
        }),
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
    expect(User.findById).toHaveBeenCalledTimes(2);
  });
});
