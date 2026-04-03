import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import {
  createCanonicalReview,
  hasCanonicalReviewForJob,
  refreshRevieweeAggregateRating,
} from '@/lib/reviews/canonical-review';
import {
  hasExistingCompletionReview,
  resolveJobReviewContext,
  submitJobCompletionReview,
} from '@/lib/reviews/job-review';
import Job from '@/models/Job';
import Review from '@/models/Review';

const JOB_REVIEWS_TTL = 300; // 5 minutes

import {
  buildUniformCategories,
  isValidObjectId,
  toObjectId,
  type CreateJobReviewInput,
  type PublicReviewsListResult,
} from './types';

export async function listJobReviews(
  jobId: string,
  pagination: { page: number; limit: number }
): Promise<PublicReviewsListResult> {
  if (!isValidObjectId(jobId)) {
    return { items: [], total: 0 };
  }

  const cacheKey = `job:reviews:v1:${jobId}:${pagination.page}:${pagination.limit}`;
  const cached = await redisUtils.get<PublicReviewsListResult>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await connectDB();

  const skip = (pagination.page - 1) * pagination.limit;
  const query = {
    job: toObjectId(jobId),
    status: 'published',
    isPublic: true,
  };

  const [items, total] = await Promise.all([
    Review.find(query)
      .select(
        [
          'reviewer',
          'rating',
          'title',
          'comment',
          'createdAt',
          'reviewType',
          'wouldRecommend',
          'helpfulVotes',
        ].join(' ')
      )
      .populate('reviewer', 'name username photoURL profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean<Array<Record<string, unknown>>>(),
    Review.countDocuments(query),
  ]);

  const result: PublicReviewsListResult = { items, total };
  await redisUtils.set(cacheKey, result, JOB_REVIEWS_TTL);
  return result;
}

export async function createJobReview(
  input: CreateJobReviewInput
): Promise<Record<string, unknown>> {
  await connectDB();

  if (!isValidObjectId(input.jobId) || !isValidObjectId(input.reviewerId)) {
    throw new Error('Invalid review context');
  }

  const job = await Job.findById(input.jobId)
    .select('title status createdBy assignedTo completion')
    .populate('createdBy', 'name username email')
    .populate('assignedTo', 'name username email');

  if (!job) {
    throw new Error('Job not found');
  }

  if (job.status !== 'completed') {
    throw new Error('Job must be completed before reviews can be submitted');
  }

  const reviewContext = resolveJobReviewContext(job, input.reviewerId);
  if (!reviewContext || !reviewContext.revieweeId) {
    throw new Error('Only job participants can review this job');
  }

  if (hasExistingCompletionReview(job, reviewContext.completionTarget)) {
    throw new Error('Review already submitted');
  }

  const hasReview = await hasCanonicalReviewForJob(
    input.jobId,
    input.reviewerId,
    reviewContext.publicReviewType
  );
  if (hasReview) {
    throw new Error('Review already submitted');
  }

  const categories = buildUniformCategories(input.rating);
  const createdReview = await createCanonicalReview({
    jobId: input.jobId,
    reviewerId: input.reviewerId,
    revieweeId: reviewContext.revieweeId,
    reviewType: reviewContext.publicReviewType,
    overall: input.rating,
    comment: input.comment,
    title: 'Job Review',
    wouldRecommend: true,
    wouldHireAgain: reviewContext.publicReviewType === 'client_to_fixer' ? true : undefined,
    categories,
  });

  await submitJobCompletionReview(job, input.reviewerId, {
    overall: input.rating,
    comment: input.comment,
    categories,
  });

  await refreshRevieweeAggregateRating(reviewContext.revieweeId);

  // Invalidate cached reviews for this job and the reviewee's user reviews
  await Promise.allSettled([
    redisUtils.invalidatePattern(`job:reviews:v1:${input.jobId}:*`),
    redisUtils.invalidatePattern(`user:reviews:v2:${reviewContext.revieweeId}:*`),
  ]);

  const review = await Review.findById(createdReview.reviewId)
    .select(
      [
        'reviewer',
        'reviewee',
        'job',
        'rating',
        'title',
        'comment',
        'createdAt',
        'reviewType',
        'wouldRecommend',
        'helpfulVotes',
      ].join(' ')
    )
    .populate('reviewer', 'name username photoURL profilePhoto')
    .populate('reviewee', 'name username photoURL profilePhoto')
    .populate('job', 'title')
    .lean<Record<string, unknown> | null>();

  if (!review) {
    throw new Error('Review not found after creation');
  }

  return review;
}
