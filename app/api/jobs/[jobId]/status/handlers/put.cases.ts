import { badRequest, forbidden, respond } from '@/lib/api/response';
import { createDisputeRecord, findActiveDisputeForJob } from '@/lib/disputes/state';
import { acceptApplicationOnJob, cancelJobOnJob, markDoneOnJob } from '@/models/job/workflow';

import { notifyUser, toIdString } from '../../job-route-utils';
import { isValidObjectId } from '../../route.shared';
import type { StatusApplication } from '../status-helpers';

import type { StatusTransitionContext } from './put.types';

export async function handleInProgressCase(
  ctx: StatusTransitionContext
): Promise<Response | null> {
  const { job, currentUser, isAdmin, isJobCreator, assignedFixerId, now } = ctx;

  if (!isAdmin && !isJobCreator) {
    return forbidden('Only the job creator can assign and start the job');
  }

  if (assignedFixerId) {
    if (!isValidObjectId(assignedFixerId)) {
      return badRequest('Invalid fixer ID');
    }

    const application = (job.applications as unknown as StatusApplication[]).find((app) => {
      const fixerRef = app?.fixer;
      const fixerId = toIdString(
        typeof fixerRef === 'object' && fixerRef !== null && '_id' in fixerRef
          ? (fixerRef as Record<string, unknown>)._id
          : fixerRef
      );
      return fixerId === assignedFixerId;
    });

    if (!application) {
      return badRequest('Fixer must have applied to be assigned');
    }

    const acceptResult = acceptApplicationOnJob(job, toIdString(application._id), now);
    if (!acceptResult.ok) {
      return badRequest('Fixer must have applied to be assigned');
    }

    await notifyUser(
      application.fixer,
      'job_assigned',
      'Job assigned to you',
      `You were assigned to "${job.title}".`,
      { jobId: job._id, hirerId: toIdString(job.createdBy) }
    );
  }

  if (!job.assignedTo) {
    return badRequest('A fixer must be assigned before starting the job');
  }

  job.status = 'in_progress';
  job.progress = {
    ...(job.progress ?? {}),
    startedAt: (job.progress as { startedAt?: Date } | undefined)?.startedAt ?? now,
  };

  return null;
}

export async function handleCompletedCase(
  ctx: StatusTransitionContext
): Promise<Response | null> {
  const { job, currentUser, isAdmin, now, completionNotes } = ctx;

  const completionActorId = toIdString(isAdmin ? job.assignedTo : currentUser._id);
  const notes =
    completionNotes ??
    (job.completion as { completionNotes?: string } | undefined)?.completionNotes ??
    '';

  const completeResult = markDoneOnJob(job, completionActorId, notes, [], now);
  if (!completeResult.ok) {
    return respond(
      {
        message:
          completeResult.code === 'job_not_in_progress'
            ? 'Job must be in progress before it can be completed'
            : 'Only the assigned fixer can mark job as completed',
      },
      completeResult.code === 'job_not_in_progress' ? 400 : 403
    );
  }

  await notifyUser(
    job.createdBy,
    'job_completed',
    'Job completed',
    `${currentUser.name ?? 'Fixer'} marked "${job.title}" as completed.`,
    { jobId: job._id, fixerId: currentUser._id }
  );

  return null;
}

export async function handleCancelledCase(
  ctx: StatusTransitionContext
): Promise<Response | null> {
  const { job, currentUser, isAdmin, isJobCreator, reason, now } = ctx;

  if (!isAdmin && !isJobCreator) {
    return forbidden('Only the job creator can cancel the job');
  }

  const cancelResult = cancelJobOnJob(
    job,
    toIdString(currentUser._id),
    reason ?? 'No reason provided',
    !isAdmin,
    now
  );
  if (!cancelResult.ok) {
    return badRequest('The job cannot be cancelled in its current state');
  }

  await notifyUser(
    job.assignedTo,
    'job_cancelled',
    'Job cancelled',
    `The job "${job.title}" was cancelled by the hirer.`,
    { jobId: job._id, reason: reason ?? 'No reason provided' }
  );

  return null;
}

export async function handleDisputedCase(
  ctx: StatusTransitionContext
): Promise<Response | null> {
  const { job, currentUser, isJobCreator, disputeReason, reason, jobId, now } = ctx;

  const otherParty = isJobCreator ? job.assignedTo : job.createdBy;
  const otherPartyId = toIdString(otherParty);
  const disputeMessage = disputeReason ?? reason ?? 'Dispute raised for this job';

  if (!otherPartyId) {
    return badRequest('A dispute requires the other party on the job');
  }

  const existingDispute = await findActiveDisputeForJob(jobId);
  const disputeRecord =
    existingDispute ??
    (await createDisputeRecord({
      jobId,
      initiatedBy: toIdString(currentUser._id),
      againstUser: otherPartyId,
      category: 'other',
      title: `Dispute for ${job.title}`,
      description: disputeMessage,
      desiredOutcome: 'mediation',
      priority: 'medium',
      evidence: [],
    }));

  job.status = 'disputed';
  job.dispute = {
    ...(job.dispute ?? {}),
    raised: true,
    raisedBy: currentUser._id,
    reason: disputeMessage,
    createdAt: (job.dispute as { createdAt?: Date } | undefined)?.createdAt ?? now,
    status: 'pending',
  };

  await notifyUser(
    otherParty,
    'job_disputed',
    'Dispute raised',
    `A dispute was raised for "${job.title}".`,
    {
      jobId: job._id,
      disputeId: disputeRecord.disputeId,
      disputeInitiatedBy: currentUser._id,
      reason: disputeMessage,
    }
  );

  return null;
}
