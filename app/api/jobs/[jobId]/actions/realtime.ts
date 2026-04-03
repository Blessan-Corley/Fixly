import { CHANNELS, EVENTS, getServerAbly } from '@/lib/ably';
import { Channels as TypedChannels, Events as TypedEvents } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { logger } from '@/lib/logger';
import { countActiveApplicationsOnJob } from '@/models/job/workflow';

import { toIdString } from '../job-route-utils';
import { publishJobCountsUpdate } from '../realtime';
import { publishJobStatusUpdate } from '../status/status-helpers';

import type { JobDocumentLike, JobStatusEventAction } from './types';

export async function publishApplicationRealtimeEvent(
  jobId: unknown,
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const normalizedJobId = toIdString(jobId);
  if (!normalizedJobId) return;

  try {
    const ably = getServerAbly();
    if (!ably) return;
    const channel = ably.channels.get(CHANNELS.jobUpdates(normalizedJobId));
    await channel.publish(eventName, {
      jobId: normalizedJobId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  } catch (error: unknown) {
    logger.error({ error, eventName }, 'Failed to publish job event');
  }
}

export async function publishJobLifecycleRealtimeEvent(
  job: JobDocumentLike,
  action: JobStatusEventAction,
  payload: {
    actorId?: unknown;
    actorName?: string;
    applicationId?: string;
    fixerId?: unknown;
    previousStatus?: string;
    reason?: string | null;
  } = {}
): Promise<void> {
  const jobId = toIdString(job._id);
  if (!jobId) return;

  await publishJobStatusUpdate(jobId, {
    action,
    actorId: toIdString(payload.actorId),
    actorName: payload.actorName ?? 'System',
    applicationId: payload.applicationId ?? null,
    fixerId: toIdString(payload.fixerId),
    jobId,
    previousStatus: payload.previousStatus ?? job.status ?? null,
    reason: payload.reason ?? null,
    status: job.status ?? null,
    timestamp: new Date().toISOString(),
  });

  if ((payload.previousStatus ?? null) !== (job.status ?? null)) {
    await publishToChannel(TypedChannels.job(jobId), TypedEvents.job.statusChanged, {
      jobId,
      previousStatus: payload.previousStatus ?? '',
      newStatus: job.status ?? '',
      changedBy: toIdString(payload.actorId) ?? '',
      changedAt: new Date().toISOString(),
    });
  }

  const marketplaceChannel = TypedChannels.marketplace;
  const marketplaceEvent =
    job.status === 'cancelled' || job.status === 'completed'
      ? TypedEvents.marketplace.jobClosed
      : TypedEvents.marketplace.jobUpdated;

  await publishToChannel(marketplaceChannel, marketplaceEvent, {
    jobId,
    status: job.status,
    updatedAt: new Date().toISOString(),
  });

  await publishJobCountsUpdate(jobId, {
    applicationCount: countActiveApplicationsOnJob(job),
  });
}

export async function publishUserRealtimeNotification(
  userId: unknown,
  payload: {
    notificationId: string;
    type: string;
    title: string;
    message: string;
    link: string;
  }
): Promise<void> {
  const normalizedUserId = toIdString(userId);
  if (!normalizedUserId) return;

  await publishToChannel(
    TypedChannels.user(normalizedUserId),
    TypedEvents.user.notificationSent,
    { ...payload, createdAt: new Date().toISOString() }
  );
}

export { EVENTS };
