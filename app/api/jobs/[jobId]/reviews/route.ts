// Phase 2: Replaced job reviews stub route with canonical review handlers.
import { after, NextRequest } from 'next/server';
import { z } from 'zod';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { requireSession } from '@/lib/api/auth';
import { parseBody, parseQuery } from '@/lib/api/parse';
import { apiSuccess, buildPaginationMeta, Errors } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import { createJobReview, listJobReviews } from '@/lib/services/public-reviews';

const paramsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

const jobReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createJobReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().trim().min(20).max(500).optional(),
  review: z.string().trim().min(20).max(500).optional(),
});

function parseJobId(params: { jobId: string }) {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return { error: Errors.validation({ jobId: ['Job ID is required'] }) };
  }

  return { data: parsed.data };
}

function mapReviewError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Job not found') {
      return Errors.notFound('Job');
    }

    if (
      error.message === 'Job must be completed before reviews can be submitted' ||
      error.message === 'Only job participants can review this job' ||
      error.message === 'Review already submitted'
    ) {
      return Errors.validation({ review: [error.message] });
    }
  }

  return Errors.internal('Failed to process job review');
}

export async function GET(req: NextRequest, props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const parsedParams = parseJobId(params);
  if ('error' in parsedParams) {
    return parsedParams.error;
  }

  const parsedQuery = parseQuery(req, jobReviewsQuerySchema);
  if ('error' in parsedQuery) {
    return Errors.validation({ query: ['Invalid pagination parameters'] });
  }

  try {
    const { page, limit } = parsedQuery.data;
    const { items, total } = await listJobReviews(parsedParams.data.jobId, { page, limit });
    return apiSuccess(items, {
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/jobs/[jobId]/reviews]');
    return Errors.internal('Failed to fetch job reviews');
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const reviewerId = auth.session.user.id;
  if (!reviewerId) {
    return Errors.unauthorized();
  }

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  const parsedParams = parseJobId(params);
  if ('error' in parsedParams) {
    return parsedParams.error;
  }

  const parsedBody = await parseBody(req, createJobReviewSchema);
  if ('error' in parsedBody) {
    return Errors.validation({ review: ['Review text and rating are required'] });
  }

  const reviewComment = parsedBody.data.comment ?? parsedBody.data.review;
  if (!reviewComment) {
    return Errors.validation({ review: ['Review text is required'] });
  }

  try {
    const review = await createJobReview({
      jobId: parsedParams.data.jobId,
      reviewerId,
      rating: parsedBody.data.rating,
      comment: reviewComment,
    });

    const reviewId = typeof review._id === 'string' ? review._id : '';
    after(async () => {
      await publishToChannel(Channels.job(parsedParams.data.jobId), Events.job.reviewPosted, {
        jobId: parsedParams.data.jobId,
        reviewId,
        reviewerId,
        rating: parsedBody.data.rating,
      });
    });

    return apiSuccess(review, {
      message: 'Review submitted successfully',
      status: 201,
    });
  } catch (error: unknown) {
    logger.error({ error }, '[POST /api/jobs/[jobId]/reviews]');
    return mapReviewError(error);
  }
}
