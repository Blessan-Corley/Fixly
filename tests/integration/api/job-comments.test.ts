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
  },
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/redisCache', () => ({
  invalidateCache: jest.fn(),
  withCache: jest.fn((handler: unknown) => handler),
}));

jest.mock('@/lib/services/notifications', () => ({
  sendTemplatedNotification: jest.fn(),
}));

jest.mock('@/app/api/jobs/[jobId]/realtime', () => ({
  publishJobCountsUpdate: jest.fn(),
}));

jest.mock('@/lib/ably', () => ({
  getServerAbly: jest.fn(() => null),
  CHANNELS: {
    jobComments: jest.fn(),
  },
  EVENTS: {
    COMMENT_POSTED: 'comment_posted',
  },
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/jobs/[jobId]/comments/route';
import { ContentValidator } from '@/lib/validations/content-validator';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/jobs/[jobId]/comments', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const userId = '507f1f77bcf86cd799439011';
  const mentionedUserId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: userId,
        name: 'Tester',
      },
    });
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (User.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      name: 'Tester',
      username: 'tester',
      role: 'fixer',
      banned: false,
    });
  });

  it('blocks contact sharing in public comments', async () => {
    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          message: 'Call me at 9876543210',
        }),
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Comment');
  });

  it('allows valid @mentions without treating them as contact sharing', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const populate = jest.fn().mockResolvedValue(undefined);
    const comments: Array<Record<string, unknown>> = [];
    (Job.findById as jest.Mock).mockResolvedValue({
      _id: jobId,
      title: 'Test job',
      createdBy: '507f1f77bcf86cd799439044',
      comments,
      save,
      populate,
    });

    const response = await POST(
      new Request(`http://localhost/api/jobs/${jobId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          message: '@alice thanks for the update',
          mentions: [
            {
              user: mentionedUserId,
              startIndex: 0,
              endIndex: 6,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ jobId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(comments).toHaveLength(1);
    expect(String(comments[0].message)).toBe('@alice thanks for the update');
    expect(save).toHaveBeenCalled();
  });
});
