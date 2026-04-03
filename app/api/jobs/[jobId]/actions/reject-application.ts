import { NextResponse } from 'next/server';

import { badRequest, notFound, ok } from '@/lib/api';
import { redisUtils } from '@/lib/redis';

import { invalidateJobReadCaches, notifyUser, toIdString } from '../job-route-utils';

import { EVENTS, publishApplicationRealtimeEvent, publishJobLifecycleRealtimeEvent } from './realtime';
import type { JobDocumentLike } from './types';

export async function rejectApplication(
  job: JobDocumentLike,
  applicationId: string
): Promise<NextResponse> {
  if (!applicationId) return badRequest('Application ID is required');

  const application = job.applications?.id(applicationId);
  if (!application) return notFound('Application');

  const previousStatus = job.status ?? 'open';
  application.status = 'rejected';
  await job.save();
  await invalidateJobReadCaches(job._id);
  // Invalidate fixer's applications cache
  void redisUtils.invalidatePattern(`fixer-apps:v1:${toIdString(application.fixer)}:*`);

  await notifyUser(
    application.fixer,
    'application_rejected',
    'Application update',
    `Your application for "${job.title}" was not selected.`,
    { jobId: job._id }
  );

  await publishApplicationRealtimeEvent(job._id, EVENTS.APPLICATION_REJECTED, {
    applicationId,
    fixerId: toIdString(application.fixer),
    status: application.status ?? 'rejected',
  });
  await publishJobLifecycleRealtimeEvent(job, 'reject_application', {
    applicationId,
    fixerId: application.fixer,
    previousStatus,
  });

  return ok({ success: true, message: 'Application rejected' });
}
