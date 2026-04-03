import { forbidden, notFound, requireSession, respond, serverError, unauthorized } from '@/lib/api';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import Job from '@/models/Job';

import {
  CACHE_HEADERS,
  getValidatedJobId,
  type JobRouteContext,
  withCacheControl,
} from '../../route.shared';

export async function GET(_request: Request, props: JobRouteContext) {
  const params = await props.params;
  try {
    await dbConnect();

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const jobIdResult = getValidatedJobId(params, 'error');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }

    const { jobId } = jobIdResult;
    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username photoURL')
      .populate('assignedTo', 'name username photoURL');

    if (!job) {
      return notFound('Job');
    }

    const isHirer = String(job.createdBy?._id || job.createdBy) === userId;
    const isFixer = !!job.assignedTo && String(job.assignedTo?._id || job.assignedTo) === userId;

    if (!isHirer && !isFixer) {
      return forbidden('Unauthorized');
    }

    const reviewStatus = job.getReviewStatusForUI(userId);
    const participants = job.getJobParticipants();

    const reviews = {
      hirer: job.completion?.hirerRating
        ? {
            rating: job.completion.hirerRating.rating,
            comment: job.completion.hirerRating.review,
            categories: job.completion.hirerRating.categories,
            submittedAt: job.completion.hirerRating.ratedAt,
            submittedBy: job.completion.hirerRating.ratedBy,
          }
        : null,
      fixer: job.completion?.fixerRating
        ? {
            rating: job.completion.fixerRating.rating,
            comment: job.completion.fixerRating.review,
            categories: job.completion.fixerRating.categories,
            submittedAt: job.completion.fixerRating.ratedAt,
            submittedBy: job.completion.fixerRating.ratedBy,
          }
        : null,
    };

    const response = respond({
      success: true,
      reviewStatus,
      participants,
      reviews,
      job: {
        id: job._id,
        title: job.title,
        status: job.status,
        completedAt: job.completion?.confirmedAt,
        messagingClosed: job.completion?.messagingClosed,
        messagingClosedAt: job.completion?.messagingClosedAt,
        reviewMessagesSent: job.completion?.reviewMessagesSent,
      },
    });
    return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
  } catch (error: unknown) {
    logger.error('Review status error:', error);
    return serverError('Failed to get review status');
  }
}
