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
}));

jest.mock('@/lib/services/notifications', () => ({
  sendTemplatedNotification: jest.fn(),
}));

jest.mock('@/lib/ably', () => ({
  getServerAbly: jest.fn(() => ({
    channels: {
      get: jest.fn(() => ({
        publish: jest.fn(),
      })),
    },
  })),
  CHANNELS: {
    jobComments: jest.fn((jobId: string) => `job:${jobId}:comments`),
  },
  EVENTS: {
    COMMENT_EDITED: 'comment_edited',
  },
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { PUT } from '@/app/api/jobs/[jobId]/comments/[commentId]/edit/route';
import { getServerAbly } from '@/lib/ably';
import { invalidateCache } from '@/lib/redisCache';
import { sendTemplatedNotification } from '@/lib/services/notifications';
import { ContentValidator } from '@/lib/validations/content-validator';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/jobs/[jobId]/comments/[commentId]/edit', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const commentId = '507f1f77bcf86cd799439041';
  const userId = '507f1f77bcf86cd799439011';
  const mentionedUserId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: userId,
      },
    });
    (User.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      name: 'Editor',
      banned: false,
    });
  });

  it('blocks contact sharing on edited public comments', async () => {
    const response = await PUT(
      new Request(`http://localhost/api/jobs/${jobId}/comments/${commentId}/edit`, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Reach me on 9876543210',
        }),
      }),
      { params: Promise.resolve({ jobId, commentId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.type).toBe('sensitive_content');
    expect(Job.findById).not.toHaveBeenCalled();
  });

  it('allows a valid @mention edit and publishes the realtime event', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const populate = jest.fn().mockResolvedValue(undefined);
    const editComment = jest.fn().mockReturnValue({
      success: true,
      message: 'Comment updated',
      comment: {
        _id: commentId,
        message: '@alice thanks for handling this',
      },
    });

    (Job.findById as jest.Mock).mockResolvedValue({
      _id: jobId,
      comments: [],
      editComment,
      save,
      populate,
    });

    const response = await PUT(
      new Request(`http://localhost/api/jobs/${jobId}/comments/${commentId}/edit`, {
        method: 'PUT',
        body: JSON.stringify({
          message: '@alice thanks for handling this',
          mentions: [
            {
              user: mentionedUserId,
              startIndex: 0,
              endIndex: 6,
            },
          ],
        }),
      }),
      { params: Promise.resolve({ jobId, commentId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(editComment).toHaveBeenCalledWith(commentId, userId, '@alice thanks for handling this', [
      {
        user: mentionedUserId,
        startIndex: 0,
        endIndex: 6,
      },
    ]);
    expect(save).toHaveBeenCalled();
    expect(sendTemplatedNotification).toHaveBeenCalledWith(
      'COMMENT_REPLY',
      mentionedUserId,
      expect.objectContaining({
        commentId,
        jobId,
      }),
      expect.objectContaining({
        senderId: userId,
      })
    );
    const mockedAbly = getServerAbly as jest.Mock;
    const channelGet = mockedAbly.mock.results[0]?.value?.channels?.get as jest.Mock;
    const publish = channelGet.mock.results[0]?.value?.publish as jest.Mock;
    expect(channelGet).toHaveBeenCalledWith(`job:${jobId}:comments`);
    expect(publish).toHaveBeenCalledWith(
      'comment_edited',
      expect.objectContaining({
        commentId,
        editedContent: '@alice thanks for handling this',
        mentions: [
          {
            user: mentionedUserId,
            startIndex: 0,
            endIndex: 6,
          },
        ],
      })
    );
    expect(invalidateCache).toHaveBeenCalledTimes(2);
  });
});
