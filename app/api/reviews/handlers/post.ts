import { requireSession, respond } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
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
import { csrfGuard } from '@/lib/security/csrf';
import { NotificationService } from '@/lib/services/notifications';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import Review from '@/models/Review';
import { rateLimit } from '@/utils/rateLimiting';

import {
  CreateReviewBody,
  CreateReviewBodySchema,
  RouteReviewType,
  getRequiredRatingsForType,
  isValidObjectId,
  sanitizeTags,
  sanitizeTextList,
} from './shared';

export async function POST(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'create_review', 5, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond({ message: 'Too many review submissions. Please try again later.' }, 429);
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return respond({ message: 'Authentication required' }, 401);
    }
    const currentUserId = auth.session.user.id;
    if (!currentUserId) {
      return respond({ message: 'Authentication required' }, 401);
    }
    const currentUserName = auth.session.user.name ?? undefined;
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, CreateReviewBodySchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }
    const body: CreateReviewBody = parsedBody.data;

    const {
      jobId,
      revieweeId,
      reviewType,
      rating,
      title,
      comment,
      pros = [],
      cons = [],
      tags = [],
      wouldRecommend = true,
      wouldHireAgain,
      attachments = [],
    } = body;

    if (!jobId || !revieweeId || !rating?.overall || !title || !comment) {
      return respond({ message: 'Missing required fields' }, 400);
    }

    if (!isValidObjectId(jobId) || !isValidObjectId(revieweeId)) {
      return respond({ message: 'Invalid job or reviewee identifier' }, 400);
    }

    if (rating.overall < 1 || rating.overall > 5) {
      return respond(
        { message: 'Overall rating must be between 1 and 5' },
        400
      );
    }

    if (title.length > 100 || comment.length > 1000) {
      return respond({ message: 'Title or comment too long' }, 400);
    }

    const reviewFields = [
      { label: 'Review title', value: title.trim() },
      { label: 'Review comment', value: comment.trim() },
    ];
    for (const field of reviewFields) {
      const moderation = await moderateUserGeneratedContent(field.value, {
        context: 'review',
        fieldLabel: field.label,
        userId: currentUserId,
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

    const reviewLists = [
      { label: 'Review pros', values: sanitizeTextList(pros, 10, 200) },
      { label: 'Review cons', values: sanitizeTextList(cons, 10, 200) },
    ];
    for (const list of reviewLists) {
      for (const item of list.values) {
        const moderation = await moderateUserGeneratedContent(item, {
          context: 'review',
          fieldLabel: list.label,
          userId: currentUserId,
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
    }

    await connectDB();

    const job = await Job.findById(jobId).select('title status createdBy assignedTo completion');

    if (!job) {
      return respond({ message: 'Job not found' }, 404);
    }

    if (job.status !== 'completed') {
      return respond({ message: 'Can only review completed jobs' }, 400);
    }

    const reviewContext = resolveJobReviewContext(job, currentUserId);
    if (!reviewContext) {
      return respond(
        { message: 'You can only review jobs you were involved in' },
        403
      );
    }

    const expectedReviewType: RouteReviewType = reviewContext.publicReviewType;
    if (reviewType && reviewType !== expectedReviewType) {
      return respond({ message: 'Invalid review type for your role' }, 400);
    }

    const expectedRevieweeId = reviewContext.revieweeId;
    if (!expectedRevieweeId || revieweeId !== expectedRevieweeId) {
      return respond({ message: 'Invalid reviewee for this job' }, 400);
    }

    if (revieweeId === currentUserId) {
      return respond({ message: 'You cannot review yourself' }, 400);
    }

    const hasCanonicalReview = await hasCanonicalReviewForJob(
      jobId,
      currentUserId,
      expectedReviewType
    );
    if (hasCanonicalReview || hasExistingCompletionReview(job, reviewContext.completionTarget)) {
      return respond({ message: 'You have already reviewed this job' }, 400);
    }

    const resolvedReviewType = expectedReviewType;
    const requiredRatings = getRequiredRatingsForType(resolvedReviewType);
    for (const key of requiredRatings) {
      const value = rating[key];
      if (!value || value < 1 || value > 5) {
        return respond(
          { message: `${key} rating is required and must be between 1 and 5` },
          400
        );
      }
    }

    const completionCategories = normalizeCompletionReviewCategories({
      categories: rating as Record<string, unknown>,
      source: rating as Record<string, unknown>,
      overall: rating.overall,
    });
    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .slice(0, 5)
          .filter((item) => item && item.type && item.url)
          .map((item) => ({
            type: item.type,
            url: item.url,
            filename: typeof item.filename === 'string' ? item.filename.slice(0, 120) : undefined,
            description:
              typeof item.description === 'string' ? item.description.slice(0, 500) : undefined,
          }))
      : [];

    const { reviewId: createdReviewId } = await createCanonicalReview({
      jobId,
      reviewerId: currentUserId,
      revieweeId,
      reviewType: resolvedReviewType,
      overall: rating.overall,
      comment: comment.trim(),
      title: title.trim(),
      pros: sanitizeTextList(pros, 10, 200),
      cons: sanitizeTextList(cons, 10, 200),
      tags: sanitizeTags(tags),
      wouldRecommend: Boolean(wouldRecommend),
      wouldHireAgain:
        resolvedReviewType === 'client_to_fixer' ? Boolean(wouldHireAgain) : undefined,
      attachments: normalizedAttachments,
      categories: completionCategories,
    });

    await submitJobCompletionReview(job, currentUserId, {
      overall: rating.overall,
      comment: comment.trim(),
      categories: completionCategories,
    });
    await refreshRevieweeAggregateRating(revieweeId);

    const populatedReview = await Review.findById(createdReviewId)
      .populate('reviewer', 'name username photoURL role')
      .populate('reviewee', 'name username photoURL role')
      .populate('job', 'title category budget')
      .lean();

    try {
      await NotificationService.notifyReviewReceived(
        String(revieweeId),
        currentUserName || 'A user',
        String(job.title || 'a job')
      );
    } catch (notificationError) {
      logger.error('Failed to create review notification:', notificationError);
    }

    // Invalidate review caches for the reviewee and this job
    await Promise.allSettled([
      redisUtils.invalidatePattern(`reviews:v1:${revieweeId}:*`),
      redisUtils.invalidatePattern(`reviews:v1:*:${jobId}:*`),
    ]);

    return respond({
      success: true,
      review: populatedReview,
      message: 'Review submitted successfully',
    });
  } catch (error) {
    logger.error('Create review error:', error);
    return respond({ message: 'Failed to create review' }, 500);
  }
}
