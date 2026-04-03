import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import {
  badRequest,
  forbidden,
  notFound,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import {
  createCanonicalReview,
  hasCanonicalReviewForJob,
  refreshRevieweeAggregateRating,
} from '@/lib/reviews/canonical-review';
import {
  getCompletionReviewStatus,
  hasExistingCompletionReview,
  normalizeCompletionReviewCategories,
  normalizeLegacyReviewType,
  resolveJobReviewContext,
  submitJobCompletionReview,
  toIdString,
} from '@/lib/reviews/job-review';
import { csrfGuard } from '@/lib/security/csrf';
import { sendReviewCompletionMessage } from '@/lib/services/automatedMessaging';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { getValidatedJobId, type JobRouteContext } from '../../route.shared';

import { notifyUser, resolveOverallRating, sanitizeString } from './review.helpers';
import { reviewBodySchema, type ReviewBody } from './review.types';

export async function POST(request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'submit_review', 5, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many review submissions. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    const parsed = await parseBody(request, reviewBodySchema);
    if ('error' in parsed) return parsed.error;
    const body: ReviewBody = parsed.data;

    const overallRating = resolveOverallRating(body.rating);
    if (overallRating === null) return badRequest('Rating must be between 1 and 5');

    const reviewText = sanitizeString(body.review ?? body.comment);
    if (reviewText.length > 1000) return badRequest('Review must be less than 1000 characters');

    if (reviewText) {
      const moderation = await moderateUserGeneratedContent(reviewText, {
        context: 'review',
        fieldLabel: 'Review',
        userId,
      });
      if (!moderation.allowed) {
        return respond(
          {
            message: moderation.message,
            violations: moderation.violations,
            suggestions: moderation.suggestions,
          },
          400
        );
      }
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    if (job.status !== 'completed') return badRequest('Can only review completed jobs');
    if (!job.assignedTo) return badRequest('This job has no assigned fixer to review');

    const reviewContext = resolveJobReviewContext(job, toIdString(user._id));
    if (!reviewContext) return forbidden('Only job participants can submit reviews');

    const requestedType = normalizeLegacyReviewType(body.reviewType);
    const expectedType = reviewContext.legacyReviewType;
    if (requestedType && requestedType !== expectedType) {
      return badRequest('Invalid review type for your role in this job');
    }

    const categories = normalizeCompletionReviewCategories({
      categories: body.categories,
      source:
        typeof body.rating === 'object' && body.rating !== null
          ? (body.rating as Record<string, unknown>)
          : {},
      overall: overallRating,
    });
    const now = new Date();

    if (hasExistingCompletionReview(job, reviewContext.completionTarget)) {
      return badRequest('Review already submitted');
    }

    if (!reviewContext.revieweeId) return badRequest('Invalid review target');

    const existingCanonicalReview = await hasCanonicalReviewForJob(
      jobId,
      toIdString(user._id),
      reviewContext.publicReviewType
    );
    if (existingCanonicalReview) return badRequest('Review already submitted');

    const { reviewId } = await createCanonicalReview({
      jobId,
      reviewerId: toIdString(user._id),
      revieweeId: reviewContext.revieweeId,
      reviewType: reviewContext.publicReviewType,
      overall: overallRating,
      comment: reviewText,
      title: 'Job Review',
      wouldRecommend: true,
      categories,
    });

    await submitJobCompletionReview(job, toIdString(user._id), {
      overall: overallRating,
      comment: reviewText,
      categories,
    });

    await refreshRevieweeAggregateRating(reviewContext.revieweeId ?? '');

    await notifyUser(
      reviewContext.revieweeId,
      'review_received',
      'New review received',
      `You received a ${overallRating}-star review for "${job.title}".`,
      { jobId: job._id, rating: overallRating, reviewerName: user.name }
    );

    const reviewStatus = getCompletionReviewStatus(job, toIdString(user._id));
    if (reviewStatus.bothReviewsComplete) {
      try {
        await sendReviewCompletionMessage(jobId);
      } catch (reviewMessageError: unknown) {
        logger.error('Failed to send review completion message:', reviewMessageError);
      }
    }

    return respond(
      {
        success: true,
        message: 'Review submitted successfully',
        review: {
          reviewId,
          rating: overallRating,
          review: reviewText,
          reviewedAt: now,
          reviewerName: user.name,
          reviewerRole: reviewContext.reviewerRole,
          reviewType: expectedType,
          categories,
        },
        reviewStatus,
      },
      201
    );
  } catch (error) {
    logger.error('Submit review error:', error);
    return serverError('Failed to submit review');
  }
}
