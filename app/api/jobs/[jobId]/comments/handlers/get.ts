import { respond, tooManyRequests } from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/utils/rateLimiting';

import type { JobRouteContext } from '../../route.shared';

import { getCommentsCached } from './shared';

export async function GET(request: Request, context: JobRouteContext) {
  try {
    const rateLimitResult = await rateLimit(request, 'job_comments_read', 180, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }
    return getCommentsCached(request, context);
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get comments error:', err);
    return respond(
      {
        message: 'Failed to fetch comments',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
