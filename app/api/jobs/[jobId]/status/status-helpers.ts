export type {
  JobStatus,
  TimelineEntry,
  AvailableStatusAction,
  StatusApplication,
  JobStatusEntity,
} from './status-types';
export {
  JOB_STATUSES,
  VALID_TRANSITIONS,
  STATUS_ROLE_PERMISSIONS,
} from './status-types';
export { getAvailableActions, publishJobStatusUpdate } from './status-actions';

import { sanitizeString, toIdString } from '../job-route-utils';

import type { JobStatus, JobStatusEntity, TimelineEntry } from './status-types';
import { JOB_STATUSES } from './status-types';

export function parseStatus(value: unknown): JobStatus | null {
  if (typeof value !== 'string') return null;
  return JOB_STATUSES.includes(value as JobStatus) ? (value as JobStatus) : null;
}

export function buildStatusHistory(job: JobStatusEntity): TimelineEntry[] {
  const timeline: TimelineEntry[] = [];

  if (job.createdAt) {
    timeline.push({
      status: 'open',
      action: 'created',
      changedAt: new Date(job.createdAt),
      reason: 'Job posted',
    });
  }

  if (job.progress?.startedAt) {
    timeline.push({
      status: 'in_progress',
      action: 'started',
      changedAt: new Date(job.progress.startedAt),
      actor: toIdString(job.assignedTo),
    });
  }

  if (job.progress?.arrivedAt) {
    timeline.push({
      status: 'in_progress',
      action: 'arrived',
      changedAt: new Date(job.progress.arrivedAt),
      actor: toIdString(job.assignedTo),
    });
  }

  if (job.progress?.completedAt) {
    timeline.push({
      status: 'completed',
      action: 'marked_completed',
      changedAt: new Date(job.progress.completedAt),
      actor: toIdString(job.completion?.markedDoneBy || job.assignedTo),
    });
  }

  if (job.completion?.confirmedAt) {
    timeline.push({
      status: 'completed',
      action: 'confirmed',
      changedAt: new Date(job.completion.confirmedAt),
      actor: toIdString(job.completion.confirmedBy || job.createdBy),
    });
  }

  if (job.cancellation?.cancelledAt) {
    timeline.push({
      status: 'cancelled',
      action: 'cancelled',
      changedAt: new Date(job.cancellation.cancelledAt),
      reason: sanitizeString(job.cancellation.reason),
      actor: toIdString(job.cancellation.cancelledBy),
    });
  }

  if (job.dispute?.raised) {
    const disputeDate = job.dispute.createdAt || job.updatedAt;
    if (disputeDate) {
      timeline.push({
        status: 'disputed',
        action: 'dispute_raised',
        changedAt: new Date(disputeDate),
        reason: sanitizeString(job.dispute.reason),
        actor: toIdString(job.dispute.raisedBy),
      });
    }
  }

  if (job.status === 'expired' && job.updatedAt) {
    timeline.push({
      status: 'expired',
      action: 'expired',
      changedAt: new Date(job.updatedAt),
    });
  }

  return timeline
    .filter((entry) => entry.changedAt instanceof Date && !Number.isNaN(entry.changedAt.getTime()))
    .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
}
