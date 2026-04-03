// Phase 2: Replaced saved-jobs stub route with validated real saved-jobs handlers.
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/api/auth';
import { parseBody, parseQuery } from '@/lib/api/parse';
import { apiSuccess, buildPaginationMeta, Errors, tooManyRequests } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import {
  listSavedJobs,
  saveJobForUser,
  unsaveJobForUser,
} from '@/lib/services/saved-jobs';
import { rateLimit } from '@/utils/rateLimiting';

const savedJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const saveJobBodySchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

async function resolveDeleteJobId(
  req: NextRequest
): Promise<{ jobId: string } | { error: ReturnType<typeof Errors.validation> }> {
  const queryJobId = req.nextUrl.searchParams.get('jobId');
  if (typeof queryJobId === 'string' && queryJobId.trim().length > 0) {
    return { jobId: queryJobId.trim() };
  }

  const parsedBody = await parseBody(req.clone(), saveJobBodySchema);
  if ('error' in parsedBody) {
    return { error: Errors.validation({ jobId: ['Job ID is required'] }) };
  }

  return { jobId: parsedBody.data.jobId };
}

function mapSavedJobError(error: unknown): ReturnType<typeof Errors.notFound> | ReturnType<typeof Errors.internal> {
  if (error instanceof Error && error.message === 'Job not found') {
    return Errors.notFound('Job');
  }

  if (error instanceof Error && error.message === 'User not found') {
    return Errors.notFound('User');
  }

  return Errors.internal();
}

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const userId = auth.session.user.id;
  if (!userId) {
    return Errors.unauthorized();
  }

  const parsedQuery = parseQuery(req, savedJobsQuerySchema);
  if ('error' in parsedQuery) {
    return Errors.validation({ query: ['Invalid pagination parameters'] });
  }

  try {
    const { page, limit } = parsedQuery.data;
    const { items, total } = await listSavedJobs(userId, { page, limit });
    return apiSuccess(items, {
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/jobs/saved]');
    return Errors.internal('Failed to fetch saved jobs');
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, 'save_job', 200, 60 * 60 * 1000);
  if (!rateLimitResult.success) {
    return tooManyRequests('Too many requests. Please try again later.');
  }

  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const userId = auth.session.user.id;
  if (!userId) {
    return Errors.unauthorized();
  }

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  const parsedBody = await parseBody(req, saveJobBodySchema);
  if ('error' in parsedBody) {
    return Errors.validation({ jobId: ['Job ID is required'] });
  }

  try {
    const result = await saveJobForUser(parsedBody.data.jobId, userId);
    return apiSuccess(result, {
      message: 'Job saved successfully',
      status: 201,
    });
  } catch (error: unknown) {
    logger.error({ error }, '[POST /api/jobs/saved]');
    return mapSavedJobError(error);
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, 'save_job', 200, 60 * 60 * 1000);
  if (!rateLimitResult.success) {
    return tooManyRequests('Too many requests. Please try again later.');
  }

  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const userId = auth.session.user.id;
  if (!userId) {
    return Errors.unauthorized();
  }

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  const parsedInput = await resolveDeleteJobId(req);
  if ('error' in parsedInput) {
    return parsedInput.error;
  }

  try {
    await unsaveJobForUser(parsedInput.jobId, userId);
    return apiSuccess(
      { jobId: parsedInput.jobId, saved: false },
      { message: 'Job removed from saved list' }
    );
  } catch (error: unknown) {
    logger.error({ error }, '[DELETE /api/jobs/saved]');
    return mapSavedJobError(error);
  }
}
