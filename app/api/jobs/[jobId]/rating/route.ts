import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { badRequest, forbidden, notFound, respond, serverError, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import User from '@/models/User';

import { getValidatedJobId, type JobRouteContext } from '../route.shared';

import {
  normalizeCategories,
  notifyUser,
  parseBoundedRating,
  ratingBodySchema,
  sanitizeString,
  toIdString,
  type JobWithReviewStatusMethod,
  type RatingBody,
  type RatingField,
} from './rating-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: JobRouteContext) {
  const params = await props.params;
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }
    const { jobId } = jobIdResult;

    const parsed = await parseBody(request, ratingBodySchema);
    if ('error' in parsed) return parsed.error;
    const body: RatingBody = parsed.data;

    const rating = parseBoundedRating(body.rating);
    if (rating === null) {
      return badRequest('Rating must be between 1 and 5');
    }

    const review = sanitizeString(body.review);
    if (review.length > 1000) {
      return badRequest('Review cannot exceed 1000 characters');
    }

    if (review) {
      const moderation = await moderateUserGeneratedContent(review, {
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

    const normalizedCategories = normalizeCategories(body.categories);
    if (normalizedCategories.invalid) {
      return badRequest('Category ratings must be between 1 and 5');
    }

    await connectDB();

    const user = await User.findById(userId).select('name role banned');
    if (!user) {
      return notFound('User');
    }

    if (user.banned) {
      return forbidden('Account suspended');
    }

    const job = await Job.findById(jobId).select('title status createdBy assignedTo completion');
    if (!job) {
      return notFound('Job');
    }

    if (job.status !== 'completed') {
      return badRequest('Job must be completed before rating');
    }

    if (!job.assignedTo) {
      return badRequest('Job has no assigned fixer');
    }

    const isHirer = toIdString(job.createdBy) === toIdString(user._id);
    const isFixer = toIdString(job.assignedTo) === toIdString(user._id);

    if (!isHirer && !isFixer) {
      return forbidden('Only job participants can rate');
    }

    const ratedBy = typeof body.ratedBy === 'string' ? body.ratedBy.trim().toLowerCase() : '';
    const expectedRatedBy = isHirer ? 'hirer' : 'fixer';
    if (ratedBy && ratedBy !== expectedRatedBy) {
      return badRequest('Invalid rating configuration');
    }

    const ratingField: RatingField = expectedRatedBy === 'hirer' ? 'fixerRating' : 'hirerRating';
    const ratedUserId = expectedRatedBy === 'hirer' ? job.assignedTo : job.createdBy;
    const jobWithReviewStatus = job as JobWithReviewStatusMethod;

    const existingRating = jobWithReviewStatus.completion?.[ratingField];
    if (existingRating?.ratedAt) {
      return badRequest('You have already rated for this job');
    }

    if (!jobWithReviewStatus.completion || typeof jobWithReviewStatus.completion !== 'object') {
      jobWithReviewStatus.completion = {};
    }

    jobWithReviewStatus.completion[ratingField] = {
      rating,
      review,
      categories: normalizedCategories.value,
      ratedBy: user._id,
      ratedAt: new Date(),
    };

    if (typeof jobWithReviewStatus.updateReviewStatus === 'function') {
      jobWithReviewStatus.updateReviewStatus();
    }

    await job.save();

    const ratedUser = await User.findById(ratedUserId);
    if (ratedUser) {
      await ratedUser.updateRating(rating);
      await notifyUser(
        ratedUser._id,
        rating,
        review,
        job._id,
        job.title || 'a job',
        user.name || 'Someone',
        user._id
      );
    }

    return respond({
      success: true,
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    logger.error('Rating submission error:', error);
    return serverError('Failed to submit rating');
  }
}
