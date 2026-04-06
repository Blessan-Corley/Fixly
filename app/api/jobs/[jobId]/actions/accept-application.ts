import { startSession } from 'mongoose';
import { NextResponse } from 'next/server';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { badRequest, notFound, ok, respond } from '@/lib/api';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import Conversation from '@/models/Conversation';
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

    // Atomic credit increment with double-spend guard.
    // Only deduct from non-pro fixers. The $lt:3 condition makes the update
    // a no-op if credits are exhausted, and matchedCount tells us which case we hit.
    const fixerPlan = await User.findById(application.fixer)
      .select('plan')
      .session(dbSession)
      .lean<{ plan?: { type?: string; status?: string } }>();

    const isProFixer =
      fixerPlan?.plan?.type === 'pro' && fixerPlan?.plan?.status === 'active';

    if (!isProFixer) {
      const creditResult = await User.updateOne(
        { _id: application.fixer, 'plan.creditsUsed': { $lt: 3 } },
        { $inc: { 'plan.creditsUsed': 1 } },
        { session: dbSession }
      );

      if (creditResult.matchedCount === 0) {
        await dbSession.abortTransaction();
        return respond(
          {
            message:
              'This fixer has used all their free credits. They need to upgrade to Pro to accept more jobs.',
            code: 'insufficient_credits',
          },
          402
        );
      }
    }

    await txJob.save({ session: dbSession });
    await dbSession.commitTransaction();

    // Post-commit side effects — no session held past this point
    await invalidateJobReadCaches(job._id);
    void redisUtils.invalidatePattern(`fixer-apps:v1:${acceptedFixerId}:*`);

    // Auto-open conversation between hirer and fixer
    const hirerId = toIdString(job.createdBy);
    let conversationId: string | null = null;
    try {
      const conversation = await Conversation.findOrCreateBetween(
        hirerId,
        acceptedFixerId,
        toIdString(job._id)
      );
      conversationId = String(conversation._id);

      // Send a system message so the conversation isn't empty
      await conversation.addMessage({
        sender: conversation.participants[0],
        content: `Your application for "${job.title ?? 'this job'}" has been accepted. You can now chat directly with the hirer.`,
        messageType: 'system',
      });

      // Notify the fixer's client to open/navigate to the new conversation
      await publishToChannel(Channels.user(acceptedFixerId), Events.user.conversationCreated, {
        conversationId,
        jobId: toIdString(job._id),
        hirerId,
        createdAt: new Date().toISOString(),
      });
    } catch (convError) {
      // Non-fatal — acceptance succeeded; conversation creation failure is logged only
      logger.error({ error: convError, acceptedFixerId, hirerId }, 'Failed to auto-create conversation after acceptance');
    }

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
      conversationId,
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
      conversationId,
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
