// Phase 2: Replaced saved-job mutation stub route with validated real handlers.
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/lib/api/auth';
import { apiSuccess, Errors } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import { saveJobForUser, unsaveJobForUser } from '@/lib/services/saved-jobs';

const paramsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

function parseJobId(params: { jobId: string }) {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    return { error: Errors.validation({ jobId: ['Job ID is required'] }) };
  }

  return { data: parsed.data };
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

export async function POST(req: NextRequest, props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const userId = auth.session.user.id;
  if (!userId) {
    return Errors.unauthorized();
  }

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  const parsedParams = parseJobId(params);
  if ('error' in parsedParams) {
    return parsedParams.error;
  }

  try {
    const saved = await saveJobForUser(parsedParams.data.jobId, userId);
    return apiSuccess(saved, {
      message: 'Job saved successfully',
      status: 201,
    });
  } catch (error: unknown) {
    logger.error({ error }, '[POST /api/jobs/[jobId]/save]');
    return mapSavedJobError(error);
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const userId = auth.session.user.id;
  if (!userId) {
    return Errors.unauthorized();
  }

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  const parsedParams = parseJobId(params);
  if ('error' in parsedParams) {
    return parsedParams.error;
  }

  try {
    await unsaveJobForUser(parsedParams.data.jobId, userId);
    return apiSuccess(
      { jobId: parsedParams.data.jobId, saved: false },
      { message: 'Job removed from saved list' }
    );
  } catch (error: unknown) {
    logger.error({ error }, '[DELETE /api/jobs/[jobId]/save]');
    return mapSavedJobError(error);
  }
}
