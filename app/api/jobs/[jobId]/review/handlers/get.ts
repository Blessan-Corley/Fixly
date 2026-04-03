import { notFound, respond, serverError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';

import {
  CACHE_HEADERS,
  getValidatedJobId,
  type JobRouteContext,
  withCacheControl,
} from '../../route.shared';

import { mapLegacyReview } from './review.helpers';
import type { JobReviewProjection } from './review.types';

export async function GET(_request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    await connectDB();

    const job = await Job.findById(jobId)
      .populate('completion.fixerRating.ratedBy', 'name username photoURL')
      .populate('completion.hirerRating.ratedBy', 'name username photoURL')
      .select('completion createdBy assignedTo status title')
      .lean<JobReviewProjection | null>();

    if (!job) return notFound('Job');

    const fixerRating = job.completion?.fixerRating ?? null;
    const hirerRating = job.completion?.hirerRating ?? null;

    const reviews = {
      hirerReview: mapLegacyReview(fixerRating),
      fixerReview: mapLegacyReview(hirerRating),
      fixerRating,
      hirerRating,
      reviewStatus: job.completion?.reviewStatus ?? 'pending',
    };

    const response = respond({ success: true, reviews });
    return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
  } catch (error) {
    logger.error('Get reviews error:', error);
    return serverError('Failed to fetch reviews');
  }
}
