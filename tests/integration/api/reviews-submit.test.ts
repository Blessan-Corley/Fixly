// Phase 2: Updated review submission integration coverage for direct request parsing and CSRF validation.
jest.mock('mongoose', () => ({
  Schema: {
    Types: {
      ObjectId: class MockObjectId {},
    },
  },
  model: jest.fn(),
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

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/Review', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
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
  normalizeCompletionReviewCategories: jest.fn(),
  resolveJobReviewContext: jest.fn(),
  submitJobCompletionReview: jest.fn(),
  toIdString: jest.fn((value: unknown) => String(value)),
}));

jest.mock('@/lib/ably', () => ({
  getServerAbly: jest.fn(() => null),
  CHANNELS: {
    userNotifications: jest.fn((userId: string) => `user:${userId}:notifications`),
  },
  EVENTS: {
    NOTIFICATION_SENT: 'notification_sent',
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/services/automatedMessaging', () => ({
  sendReviewCompletionMessage: jest.fn(),
}));

jest.mock('@/lib/services/notifications', () => ({
  NotificationService: {
    notifyReviewReceived: jest.fn(),
  },
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

import { POST } from '@/app/api/reviews/submit/route';
import {
  createCanonicalReview,
  hasCanonicalReviewForJob,
  refreshRevieweeAggregateRating,
} from '@/lib/reviews/canonical-review';
import {
  getCompletionReviewStatus,
  hasExistingCompletionReview,
  normalizeCompletionReviewCategories,
  resolveJobReviewContext,
  submitJobCompletionReview,
} from '@/lib/reviews/job-review';
import { sendReviewCompletionMessage } from '@/lib/services/automatedMessaging';
import { ContentValidator } from '@/lib/validations/content-validator';
import Job from '@/models/Job';
import Review from '@/models/Review';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/reviews/submit', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const reviewerId = '507f1f77bcf86cd799439011';
  const revieweeId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: reviewerId,
        name: 'Reviewer',
      },
    });
  });

  it('rejects abusive review text before loading the job', async () => {
    const response = await POST(
      new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          rating: 5,
          comment: 'You are an idiot',
          title: 'Great work overall',
          categories: { quality: 5 },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Validation failed');
    expect(Job.findById).not.toHaveBeenCalled();
  });

  it('submits a valid review and closes the messaging loop when both reviews are complete', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const job = {
      _id: jobId,
      status: 'completed',
      title: 'Pipe repair',
      createdBy: { _id: revieweeId, name: 'Hirer' },
      assignedTo: { _id: reviewerId, name: 'Fixer' },
      completion: {
        reviewMessagesSent: false,
        messagingClosed: true,
      },
      save,
    };
    const jobQuery: typeof job & { populate: jest.Mock } = Object.assign({}, job, {
      populate: jest.fn(),
    });
    jobQuery.populate.mockReturnValue(jobQuery);
    (Job.findById as jest.Mock).mockReturnValue(jobQuery);

    (resolveJobReviewContext as jest.Mock).mockReturnValue({
      isHirer: false,
      revieweeId,
      publicReviewType: 'fixer_to_hirer',
      completionTarget: 'hirerRating',
    });
    (hasCanonicalReviewForJob as jest.Mock).mockResolvedValue(false);
    (hasExistingCompletionReview as jest.Mock).mockReturnValue(false);
    (normalizeCompletionReviewCategories as jest.Mock).mockReturnValue({ quality: 5, overall: 5 });
    (createCanonicalReview as jest.Mock).mockResolvedValue({
      reviewId: '507f1f77bcf86cd799439099',
    });
    (submitJobCompletionReview as jest.Mock).mockResolvedValue(undefined);
    (refreshRevieweeAggregateRating as jest.Mock).mockResolvedValue(undefined);
    (getCompletionReviewStatus as jest.Mock).mockReturnValue({ bothReviewsComplete: true });

    const reviewDoc = {
      populate: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(() => ({ _id: '507f1f77bcf86cd799439099', rating: 5 })),
    };
    (Review.findById as jest.Mock).mockResolvedValue(reviewDoc);

    const response = await POST(
      new Request('http://localhost/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          rating: 5,
          comment: 'Excellent communication and payment.',
          title: 'Great work overall',
          categories: { quality: 5 },
          pros: ['Prompt payment'],
          cons: [],
          wouldRecommend: true,
          wouldHireAgain: true,
          tags: ['responsive'],
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(createCanonicalReview).toHaveBeenCalled();
    expect(submitJobCompletionReview).toHaveBeenCalledWith(
      expect.objectContaining({ _id: jobId }),
      reviewerId,
      expect.objectContaining({
        overall: 5,
        comment: 'Excellent communication and payment.',
      })
    );
    expect(refreshRevieweeAggregateRating).toHaveBeenCalledWith(revieweeId);
    expect(sendReviewCompletionMessage).toHaveBeenCalledWith(jobId);
    expect(save).toHaveBeenCalled();
  });
});
