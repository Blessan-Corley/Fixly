// Phase 2: Replaced public user reviews stub route with validated canonical review queries.
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { parseQuery } from '@/lib/api/parse';
import { apiSuccess, buildPaginationMeta, Errors } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { listUserReviews } from '@/lib/services/public-reviews';

const paramsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const userReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function parseUserId(params: { userId: string }) {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return { error: Errors.validation({ userId: ['User ID is required'] }) };
  }

  return { data: parsed.data };
}

export async function GET(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const parsedParams = parseUserId(params);
  if ('error' in parsedParams) {
    return parsedParams.error;
  }

  const parsedQuery = parseQuery(req, userReviewsQuerySchema);
  if ('error' in parsedQuery) {
    return Errors.validation({ query: ['Invalid pagination parameters'] });
  }

  try {
    const { page, limit } = parsedQuery.data;
    const { items, total, stats } = await listUserReviews(parsedParams.data.userId, {
      page,
      limit,
    });

    return apiSuccess(items, {
      meta: {
        ...buildPaginationMeta(total, page, limit),
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        distribution: stats.distribution,
      },
    });
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/users/[userId]/reviews]');
    return Errors.internal('Failed to fetch user reviews');
  }
}
