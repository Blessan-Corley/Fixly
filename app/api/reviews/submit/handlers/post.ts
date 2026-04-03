// Phase 2: Updated review submission mutations to validate CSRF against the authenticated session.
import { requireSession, respond, tooManyRequests } from '@/lib/api';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
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
import { csrfGuard } from '@/lib/security/csrf';
import { sendReviewCompletionMessage } from '@/lib/services/automatedMessaging';
import { NotificationService } from '@/lib/services/notifications';
import Job from '@/models/Job';
import Review from '@/models/Review';
import { rateLimit } from '@/utils/rateLimiting';

import { RouteError } from './post.types';
import {
  isValidObjectId,
  parseAndValidateReviewRequest,
  toSafeErrorMessage,
} from './post.validators';

export async function POST(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'submit_review', 5, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    await dbConnect();

    const auth = await requireSession();
    if ('error' in auth) return respond({ error: 'Authentication required' }, 401);
    const currentUserId = auth.session.user.id;
    if (!currentUserId) return respond({ error: 'Authentication required' }, 401);
    const currentUserName = auth.session.user.name ?? undefined;
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    let validatedData: Awaited<ReturnType<typeof parseAndValidateReviewRequest>>;
    try {
      validatedData = await parseAndValidateReviewRequest(request, currentUserId);
    } catch (error: unknown) {
      const status = error instanceof RouteError ? error.status : 400;
      return respond({ error: 'Validation failed', message: toSafeErrorMessage(error) }, status);
    }

    const {
      jobId,
      rating,
      comment,
      categories,
      title = 'Job Review',
      pros = [],
      cons = [],
      wouldRecommend = true,
      wouldHireAgain,
      tags = [],
    } = validatedData;

    if (!isValidObjectId(jobId)) return respond({ error: 'Invalid job ID' }, 400);
    if (rating < 1 || rating > 5) return respond({ error: 'Rating must be between 1 and 5' }, 400);

    for (const categoryRating of Object.values(categories)) {
      if (typeof categoryRating !== 'number' || categoryRating < 1 || categoryRating > 5) {
        return respond({ error: 'Category ratings must be between 1 and 5' }, 400);
      }
    }

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username email')
      .populate('assignedTo', 'name username email');

    if (!job) return respond({ error: 'Job not found' }, 404);

    const reviewContext = resolveJobReviewContext(job, currentUserId);
    if (!reviewContext) {
      return respond({ error: 'Only job participants can submit reviews' }, 403);
    }

    if (job.status !== 'completed') {
      return respond({ error: 'Job must be completed before reviews can be submitted' }, 400);
    }

    if (reviewContext.isHirer && !reviewContext.revieweeId) {
      return respond({ error: 'Cannot review fixer before assignment' }, 400);
    }

    const reviewType = reviewContext.publicReviewType;
    const revieweeId = reviewContext.revieweeId;
    if (!revieweeId) return respond({ error: 'Invalid review target' }, 400);

    const existingReview = await hasCanonicalReviewForJob(jobId, currentUserId, reviewType);
    if (existingReview) return respond({ error: 'You have already reviewed this job' }, 400);

    if (hasExistingCompletionReview(job, reviewContext.completionTarget)) {
      return respond({ error: 'You have already reviewed this job' }, 400);
    }

    const completionCategories = normalizeCompletionReviewCategories({
      categories,
      overall: rating,
    });
    const { reviewId } = await createCanonicalReview({
      jobId,
      reviewerId: currentUserId,
      revieweeId,
      reviewType,
      overall: rating,
      comment,
      title,
      pros,
      cons,
      wouldRecommend,
      wouldHireAgain,
      tags,
      categories: completionCategories,
    });

    await submitJobCompletionReview(job, currentUserId, {
      overall: rating,
      comment,
      categories: completionCategories,
    });

    await refreshRevieweeAggregateRating(revieweeId);

    const reviewStatus = getCompletionReviewStatus(job, currentUserId);

    try {
      await NotificationService.notifyReviewReceived(
        String(revieweeId),
        currentUserName ?? 'A user',
        String(job.title ?? 'a job')
      );
    } catch (error: unknown) {
      logger.error('Review notification publish failed:', error);
    }

    if (reviewStatus.bothReviewsComplete && !job.completion?.reviewMessagesSent) {
      try {
        await sendReviewCompletionMessage(jobId);
        job.completion.reviewMessagesSent = true;
        await job.save();
      } catch (error: unknown) {
        logger.error('Failed to process review completion messaging:', error);
      }
    }

    const review = await Review.findById(reviewId);
    await review?.populate([
      { path: 'reviewer', select: 'name username photoURL' },
      { path: 'reviewee', select: 'name username photoURL' },
    ]);

    // Invalidate review caches for the reviewee and this job
    await Promise.allSettled([
      redisUtils.invalidatePattern(`reviews:v1:${revieweeId}:*`),
      redisUtils.invalidatePattern(`reviews:v1:*:${jobId}:*`),
    ]);

    return respond({
      success: true,
      message: 'Review submitted successfully',
      review: review?.toObject() ?? null,
      reviewStatus,
      messagingClosed: Boolean(job.completion?.messagingClosed),
    });
  } catch (error: unknown) {
    logger.error('Review submission error:', error);
    return respond({ error: 'Failed to submit review' }, 500);
  }
}
