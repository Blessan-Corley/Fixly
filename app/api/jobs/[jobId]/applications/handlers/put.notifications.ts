import {
  Channels as TypedChannels,
  Events as TypedEvents,
  type ApplicationUpdatedPayload,
} from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import User from '@/models/User';

import { hasLeanMethod, hasSelectMethod, isFixerContact } from './applications.helpers';

type ApplicationDecisionStatus = 'accepted' | 'rejected';

type RejectedApplicant = { fixerId: string; jobTitle: string };

export type NotifyApplicationDecisionParams = {
  jobId: string;
  applicationId: string;
  previousStatus: string;
  nextStatus: ApplicationDecisionStatus;
  jobTitle: string;
  updatedFixerId: string;
  hirerId: string;
  hirerName: string;
  rejectedApplicants: RejectedApplicant[];
};

export async function notifyApplicationDecision(
  params: NotifyApplicationDecisionParams
): Promise<void> {
  const {
    jobId,
    applicationId,
    previousStatus,
    nextStatus,
    jobTitle,
    updatedFixerId,
    hirerId,
    hirerName,
    rejectedApplicants,
  } = params;

  await publishToChannel(TypedChannels.job(jobId), TypedEvents.job.applicationUpdated, {
    jobId,
    applicationId,
    previousStatus,
    newStatus: nextStatus,
  } satisfies ApplicationUpdatedPayload);

  if (updatedFixerId) {
    await publishToChannel(
      TypedChannels.user(updatedFixerId),
      TypedEvents.user.notificationSent,
      {
        notificationId: `application:${applicationId}:${nextStatus}`,
        type: nextStatus === 'accepted' ? 'application_accepted' : 'application_rejected',
        title: nextStatus === 'accepted' ? 'Application accepted!' : 'Application not selected',
        message:
          nextStatus === 'accepted'
            ? `You've been selected for "${jobTitle}"`
            : `Your application to "${jobTitle}" was not selected`,
        link: `/dashboard/jobs/${jobId}`,
        createdAt: new Date().toISOString(),
      }
    );
  }

  if (nextStatus === 'accepted') {
    await publishToChannel(TypedChannels.job(jobId), TypedEvents.job.jobAssigned, {
      jobId,
      fixerId: updatedFixerId,
      hirerId,
      status: 'assigned',
      changedAt: new Date().toISOString(),
    });
  }

  if (!updatedFixerId) return;

  let targetFixer = null;
  try {
    const fixerLookup = User.findById(updatedFixerId);
    const selectedLookup = hasSelectMethod(fixerLookup)
      ? fixerLookup.select('email name')
      : fixerLookup;
    const resolvedFixer = hasLeanMethod(selectedLookup)
      ? await selectedLookup.lean()
      : await selectedLookup;
    targetFixer = isFixerContact(resolvedFixer) ? resolvedFixer : null;
  } catch (fixerLookupError) {
    logger.error('Accepted fixer lookup failed:', fixerLookupError);
  }

  try {
    if (nextStatus === 'accepted') {
      await inngest.send({
        name: 'job/application.accepted',
        data: {
          jobId,
          jobTitle,
          fixerId: updatedFixerId,
          fixerEmail: targetFixer?.email ?? '',
          fixerName: targetFixer?.name ?? 'Fixer',
          hirerId,
          hirerName,
          rejectedApplicants,
        },
      });
    } else {
      await inngest.send({
        name: 'job/application.rejected',
        data: {
          jobId,
          jobTitle,
          fixerId: updatedFixerId,
          fixerEmail: targetFixer?.email ?? '',
          fixerName: targetFixer?.name ?? 'Fixer',
        },
      });
    }
  } catch (inngestError) {
    logger.error('Application workflow event dispatch failed:', inngestError);
  }
}
