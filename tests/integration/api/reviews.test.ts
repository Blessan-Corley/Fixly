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

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
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
    find: jest.fn(),
    countDocuments: jest.fn(),
    getAverageRating: jest.fn(),
    getDetailedRatings: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
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
  hasExistingCompletionReview: jest.fn(),
  normalizeCompletionReviewCategories: jest.fn(),
  resolveJobReviewContext: jest.fn(),
  submitJobCompletionReview: jest.fn(),
}));

jest.mock('@/lib/validations/content-policy', () => ({
  moderateUserGeneratedContent: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/reviews/route';
import {
  createCanonicalReview,
  hasCanonicalReviewForJob,
  refreshRevieweeAggregateRating,
} from '@/lib/reviews/canonical-review';
import {
  hasExistingCompletionReview,
  normalizeCompletionReviewCategories,
  resolveJobReviewContext,
  submitJobCompletionReview,
} from '@/lib/reviews/job-review';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/reviews', () => {
  const jobId = '507f1f77bcf86cd799439031';
  const reviewerId = '507f1f77bcf86cd799439011';
  const revieweeId = '507f1f77bcf86cd799439022';

  beforeEach(() => {
    jest.clearAllMocks();

    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: reviewerId,
        name: 'Reviewer',
        csrfToken: TEST_CSRF_TOKEN,
      },
    });
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({ allowed: true });
    (hasCanonicalReviewForJob as jest.Mock).mockResolvedValue(false);
    (hasExistingCompletionReview as jest.Mock).mockReturnValue(false);
    (normalizeCompletionReviewCategories as jest.Mock).mockReturnValue({
      communication: 5,
      quality: 4,
      timeliness: 5,
      professionalism: 4,
    });
    (resolveJobReviewContext as jest.Mock).mockReturnValue({
      publicReviewType: 'client_to_fixer',
      revieweeId,
      completionTarget: 'fixerRating',
    });
    (createCanonicalReview as jest.Mock).mockResolvedValue({
      reviewId: 'review-1',
    });

    const populatedReviewQuery = {
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'review-1',
        reviewType: 'client_to_fixer',
      }),
    };
    (Review.findById as jest.Mock).mockReturnValue(populatedReviewQuery);

    (User.findById as jest.Mock).mockResolvedValue({
      addNotification: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('creates a canonical review and syncs job completion review state', async () => {
    const jobDocument = {
      _id: jobId,
      title: 'Kitchen repair',
      status: 'completed',
      createdBy: reviewerId,
      assignedTo: revieweeId,
      completion: {},
      submitReview: jest.fn().mockResolvedValue(undefined),
    };

    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(jobDocument),
    });

    const response = await POST(
      new Request('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          revieweeId,
          reviewType: 'client_to_fixer',
          title: 'Solid work',
          comment: 'Arrived on time and finished properly.',
          rating: {
            overall: 5,
            workQuality: 4,
            communication: 5,
            punctuality: 5,
            professionalism: 4,
          },
          pros: ['Clear updates'],
          cons: ['None'],
          tags: ['excellent_work'],
          wouldRecommend: true,
          wouldHireAgain: true,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(createCanonicalReview).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId,
        reviewerId,
        revieweeId,
        reviewType: 'client_to_fixer',
        overall: 5,
      })
    );
    expect(submitJobCompletionReview).toHaveBeenCalledWith(
      jobDocument,
      reviewerId,
      expect.objectContaining({
        overall: 5,
        comment: 'Arrived on time and finished properly.',
      })
    );
    expect(refreshRevieweeAggregateRating).toHaveBeenCalledWith(revieweeId);
  });

  it('rejects duplicate reviews when the canonical review already exists', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: jobId,
        title: 'Kitchen repair',
        status: 'completed',
        createdBy: reviewerId,
        assignedTo: revieweeId,
        completion: {},
      }),
    });
    (hasCanonicalReviewForJob as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          jobId,
          revieweeId,
          title: 'Solid work',
          comment: 'Arrived on time and finished properly.',
          rating: {
            overall: 5,
            workQuality: 4,
            communication: 5,
            punctuality: 5,
            professionalism: 4,
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('You have already reviewed this job');
    expect(createCanonicalReview).not.toHaveBeenCalled();
    expect(submitJobCompletionReview).not.toHaveBeenCalled();
  });
});
