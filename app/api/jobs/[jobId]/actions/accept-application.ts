import { startSession } from 'mongoose';
import { NextResponse } from 'next/server';

import { badRequest, notFound, ok } from '@/lib/api';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import { acceptApplicationOnJob } from '@/models/job/workflow';
import User from '@/models/User';

import { invalidateJobReadCaches, notifyUser, toIdString } from '../job-route-utils';

import {
  EVENTS,
  publishApplicationRealtimeEvent,
  publishJobLifecycleRealtimeEvent,
} from './realtime';
import type { JobDocumentLike } from './types';

export async function acceptApplication(
  job: JobDocumentLike,
  applicationId: string
): Promise<NextResponse> {
  if (!applicationId) return badRequest('Application ID is required');

  const previousStatus = job.status ?? 'open';
  const fixerId = toIdString(
    (job as unknown as { applications: Array<{ _id: unknown; fixer: unknown }> }).applications?.find(
      (a) => String(a._id) === applicationId
    )?.fixer
  );

  const dbSession = await startSession();
  let fixerNotified = false;

  try {
    dbSession.startTransaction();

    const txJob = await Job.findById(job._id).session(dbSession);
    if (!txJob) {
      await dbSession.abortTransaction();
      return notFound('Job');
    }

    const workflowJob = txJob as unknown as Parameters<typeof acceptApplicationOnJob>[0];
    const result = acceptApplicationOnJob(workflowJob, applicationId);
    if (!result.ok) {
      await dbSession.abortTransaction();
      switch (result.code) {
        case 'application_not_found':
          return notFound('Application');
        case 'job_not_open':
          return badRequest('Job is not open for applications');
        default:
          return badRequest('Failed to accept application');
      }
    }

    const application = result.value;
    const acceptedFixerId = toIdString(application.fixer);

    // Atomic credit increment — avoids read-modify-save race condition
    await User.updateOne(
      {
        _id: application.fixer,
        $or: [{ 'plan.type': { $ne: 'pro' } }, { 'plan.status': { $ne: 'active' } }],
      },
      { $inc: { 'plan.creditsUsed': 1 } },
      { session: dbSession }
    );

    await txJob.save({ session: dbSession });
    await dbSession.commitTransaction();

    // Post-commit side effects
    await invalidateJobReadCaches(job._id);
    void redisUtils.invalidatePattern(`fixer-apps:v1:${acceptedFixerId}:*`);

    // Notify fixer outside transaction to avoid holding session
    const fixer = await User.findById(application.fixer).select('_id name plan').lean();
    if (fixer) {
      fixerNotified = true;
      await notifyUser(
        fixer._id,
        'application_accepted',
        'Application accepted',
        `Your application for "${job.title}" was accepted.`,
        { jobId: job._id }
      );
    }

    await publishApplicationRealtimeEvent(job._id, EVENTS.APPLICATION_ACCEPTED, {
      applicationId,
      fixerId: acceptedFixerId,
      status: application.status ?? 'accepted',
    });
    await publishApplicationRealtimeEvent(job._id, EVENTS.JOB_ASSIGNED, {
      applicationId,
      fixerId: acceptedFixerId,
      status: txJob.status ?? 'in_progress',
    });
    await publishJobLifecycleRealtimeEvent(txJob as unknown as JobDocumentLike, 'accept_application', {
      applicationId,
      fixerId: application.fixer,
      previousStatus,
    });

    return ok({
      success: true,
      message: 'Application accepted successfully',
      job: await Job.findById(job._id).populate('assignedTo', 'name username photoURL rating'),
    });
  } catch (error) {
    if (dbSession.inTransaction()) {
      await dbSession.abortTransaction();
    }
    throw error;
  } finally {
    dbSession.endSession();
    void fixerNotified; // suppress unused variable warning
  }
}
