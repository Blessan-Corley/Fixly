import { NextResponse } from 'next/server';

import { badRequest, forbidden, ok } from '@/lib/api';
import { markDoneOnJob, confirmCompletionOnJob } from '@/models/job/workflow';
import User from '@/models/User';

import { invalidateJobReadCaches, notifyUser, sanitizeString, toIdString } from '../job-route-utils';

import { publishJobLifecycleRealtimeEvent, publishUserRealtimeNotification } from './realtime';
import type { ActionUserLike, JobDocumentLike } from './types';

function parseRating(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1 || numeric > 5) return null;
  return numeric;
}

export async function markJobCompleted(
  job: JobDocumentLike,
  user: ActionUserLike,
  data: Record<string, unknown>,
  isAdmin: boolean
): Promise<NextResponse> {
  const previousStatus = job.status ?? 'in_progress';
  const fixerId = isAdmin ? job.assignedTo : user._id;
  const workflowJob = job as unknown as Parameters<typeof markDoneOnJob>[0];
  const result = markDoneOnJob(workflowJob, toIdString(fixerId), sanitizeString(data.notes));
  if (!result.ok) {
    switch (result.code) {
      case 'not_assigned':
      case 'not_assigned_fixer':
        return forbidden('Only the assigned fixer can mark job as completed');
      case 'job_not_in_progress':
        return badRequest('Job must be in progress to mark as completed');
      default:
        return badRequest('Failed to mark job as completed');
    }
  }

  await job.save();
  await invalidateJobReadCaches(job._id);

  if (job.assignedTo) {
    const fixer = await User.findById(job.assignedTo);
    if (fixer) {
      fixer.jobsCompleted = Number(fixer.jobsCompleted ?? 0) + 1;
      if (typeof job.budget?.amount === 'number') {
        fixer.totalEarnings = Number(fixer.totalEarnings ?? 0) + job.budget.amount;
      }
      await fixer.save();
    }
  }

  await notifyUser(
    job.createdBy,
    'job_completed',
    'Job marked completed',
    `${user.name ?? 'The fixer'} marked "${job.title}" as completed. Please confirm completion.`,
    { jobId: job._id }
  );
  await publishUserRealtimeNotification(job.createdBy, {
    notificationId: `job:${toIdString(job._id)}:completed`,
    type: 'job_status',
    title: 'Job marked completed',
    message: `${user.name ?? 'The fixer'} marked "${job.title}" as completed. Please confirm completion.`,
    link: `/dashboard/jobs/${toIdString(job._id)}`,
  });
  await publishJobLifecycleRealtimeEvent(job, 'mark_completed', {
    actorId: user._id,
    actorName: user.name,
    previousStatus,
    reason: sanitizeString(data.notes) || null,
  });

  return ok({ success: true, message: 'Job marked as completed' });
}

export async function confirmJobCompletion(
  job: JobDocumentLike,
  user: ActionUserLike,
  data: Record<string, unknown>,
  isAdmin: boolean
): Promise<NextResponse> {
  const rating = parseRating(data.rating);
  if (data.rating !== undefined && rating === null) return badRequest('Rating must be between 1 and 5');

  const previousStatus = job.status ?? 'completed';
  const review = sanitizeString(data.review);
  if (review.length > 1000) return badRequest('Review cannot exceed 1000 characters');

  const confirmedRating = rating ?? job.completion?.rating ?? 5;
  const confirmedReview = review || job.completion?.review || '';
  const workflowJob = job as unknown as Parameters<typeof confirmCompletionOnJob>[0];
  const result = confirmCompletionOnJob(
    workflowJob,
    toIdString(user._id),
    confirmedRating,
    confirmedReview
  );
  if (!result.ok) {
    switch (result.code) {
      case 'not_job_creator':
        return forbidden('Only the job creator can confirm completion');
      case 'job_not_completed':
        return badRequest('Job must be marked as completed by fixer first');
      default:
        return badRequest('Failed to confirm job completion');
    }
  }

  await job.save();
  await invalidateJobReadCaches(job._id);

  if (rating !== null && job.assignedTo) {
    const fixer = await User.findById(job.assignedTo);
    if (fixer) {
      await fixer.updateRating(rating);
      await notifyUser(
        fixer._id,
        'job_confirmed',
        'Job completion confirmed',
        `Your work on "${job.title}" was confirmed with a ${rating}-star rating.`,
        { jobId: job._id, rating }
      );
      await publishUserRealtimeNotification(fixer._id, {
        notificationId: `job:${toIdString(job._id)}:confirmed`,
        type: 'job_status',
        title: 'Job completion confirmed',
        message: `Your work on "${job.title}" was confirmed${rating ? ` with a ${rating}-star rating.` : '.'}`,
        link: `/dashboard/jobs/${toIdString(job._id)}`,
      });
    }
  }

  await publishJobLifecycleRealtimeEvent(job, 'confirm_completion', {
    actorId: user._id,
    actorName: user.name,
    previousStatus,
    reason: review || null,
  });

  return ok({ success: true, message: 'Job completion confirmed successfully' });
}
