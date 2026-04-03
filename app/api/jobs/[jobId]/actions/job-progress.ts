import { NextResponse } from 'next/server';

import { badRequest, forbidden, ok } from '@/lib/api';

import { invalidateJobReadCaches, notifyUser, toIdString } from '../job-route-utils';

import { publishJobLifecycleRealtimeEvent, publishUserRealtimeNotification } from './realtime';
import type { ActionUserLike, JobDocumentLike } from './types';

export async function markJobInProgress(
  job: JobDocumentLike,
  user: ActionUserLike,
  isAdmin: boolean
): Promise<NextResponse> {
  if (!isAdmin && (!job.assignedTo || toIdString(job.assignedTo) !== toIdString(user._id))) {
    return forbidden('Only the assigned fixer can mark job as in progress');
  }

  if (job.status !== 'in_progress') {
    return badRequest('Job must be in progress status');
  }

  job.progress = {
    ...(job.progress ?? {}),
    startedAt: job.progress?.startedAt ?? new Date(),
  };

  await job.save();
  await invalidateJobReadCaches(job._id);

  await notifyUser(
    job.createdBy,
    'job_in_progress',
    'Work started',
    `${user.name ?? 'The fixer'} started working on "${job.title}".`,
    { jobId: job._id }
  );
  await publishJobLifecycleRealtimeEvent(job, 'mark_in_progress', {
    actorId: user._id,
    actorName: user.name,
    previousStatus: job.status ?? 'in_progress',
  });

  return ok({ success: true, message: 'Job marked as in progress' });
}

export async function confirmJobProgress(
  job: JobDocumentLike,
  user: ActionUserLike,
  isAdmin: boolean
): Promise<NextResponse> {
  if (!isAdmin && toIdString(job.createdBy) !== toIdString(user._id)) {
    return forbidden('Only the job creator can confirm progress');
  }

  if (job.status !== 'in_progress') {
    return badRequest('Job must be in progress');
  }

  job.progress = {
    ...(job.progress ?? {}),
    confirmedAt: new Date(),
  };

  await job.save();
  await invalidateJobReadCaches(job._id);

  await notifyUser(
    job.assignedTo,
    'progress_confirmed',
    'Progress confirmed',
    `The client confirmed your progress on "${job.title}".`,
    { jobId: job._id }
  );
  await publishUserRealtimeNotification(job.assignedTo, {
    notificationId: `job:${toIdString(job._id)}:progress-confirmed`,
    type: 'job_status',
    title: 'Progress confirmed',
    message: `The client confirmed your progress on "${job.title}".`,
    link: `/dashboard/jobs/${toIdString(job._id)}`,
  });
  await publishJobLifecycleRealtimeEvent(job, 'confirm_progress', {
    actorId: user._id,
    actorName: user.name,
    previousStatus: job.status ?? 'in_progress',
  });

  return ok({ success: true, message: 'Progress confirmed successfully' });
}

export async function markFixerArrived(
  job: JobDocumentLike,
  user: ActionUserLike,
  isAdmin: boolean
): Promise<NextResponse> {
  if (!isAdmin && (!job.assignedTo || toIdString(job.assignedTo) !== toIdString(user._id))) {
    return forbidden('Only the assigned fixer can mark arrival');
  }

  if (job.status !== 'in_progress') {
    return badRequest('Job must be in progress to mark arrival');
  }

  if (job.progress?.arrivedAt) {
    return badRequest('Arrival already marked');
  }

  job.progress = {
    ...(job.progress ?? {}),
    arrivedAt: new Date(),
  };

  await job.save();
  await invalidateJobReadCaches(job._id);

  await notifyUser(
    job.createdBy,
    'fixer_arrived',
    'Fixer arrived',
    `${user.name ?? 'The fixer'} has arrived for "${job.title}".`,
    { jobId: job._id }
  );
  await publishUserRealtimeNotification(job.createdBy, {
    notificationId: `job:${toIdString(job._id)}:arrived`,
    type: 'job_status',
    title: 'Fixer arrived',
    message: `${user.name ?? 'The fixer'} has arrived for "${job.title}".`,
    link: `/dashboard/jobs/${toIdString(job._id)}`,
  });
  await publishJobLifecycleRealtimeEvent(job, 'mark_arrived', {
    actorId: user._id,
    actorName: user.name,
    previousStatus: job.status ?? 'in_progress',
  });

  return ok({ success: true, message: 'Arrival confirmed successfully' });
}
