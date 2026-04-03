import { NextResponse } from 'next/server';

import { badRequest, ok } from '@/lib/api';
import { cancelJobOnJob } from '@/models/job/workflow';

import { invalidateJobReadCaches, notifyUser, toIdString } from '../job-route-utils';

import { publishJobLifecycleRealtimeEvent, publishUserRealtimeNotification } from './realtime';
import type { JobDocumentLike } from './types';

export async function cancelJob(job: JobDocumentLike, reason: string): Promise<NextResponse> {
  const previousStatus = job.status ?? '';
  const workflowJob = job as unknown as Parameters<typeof cancelJobOnJob>[0];
  const result = cancelJobOnJob(
    workflowJob,
    toIdString(job.createdBy),
    reason || 'No reason provided',
    true
  );
  if (!result.ok) return badRequest('Job cannot be cancelled in current status');

  await job.save();
  await invalidateJobReadCaches(job._id);

  await notifyUser(
    job.assignedTo,
    'job_cancelled',
    'Job cancelled',
    `The job "${job.title}" has been cancelled by the hirer.`,
    { jobId: job._id }
  );
  await publishUserRealtimeNotification(job.assignedTo, {
    notificationId: `job:${toIdString(job._id)}:cancelled`,
    type: 'job_status',
    title: 'Job cancelled',
    message: `The job "${job.title}" has been cancelled by the hirer.`,
    link: `/dashboard/jobs/${toIdString(job._id)}`,
  });
  await publishJobLifecycleRealtimeEvent(job, 'cancel_job', {
    previousStatus,
    reason: reason || 'No reason provided',
  });

  return ok({ success: true, message: 'Job cancelled successfully' });
}
