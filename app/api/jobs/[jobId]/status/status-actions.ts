import { CHANNELS, EVENTS, getServerAbly } from '@/lib/ably';
import { logger } from '@/lib/logger';

import type { AvailableStatusAction, JobStatusEntity } from './status-types';

export function getAvailableActions(
  job: JobStatusEntity,
  isJobCreator: boolean,
  isAssignedFixer: boolean,
  isAdmin: boolean
): AvailableStatusAction[] {
  const actions: AvailableStatusAction[] = [];

  if (isAdmin) {
    switch (job.status) {
      case 'open':
        actions.push(
          {
            action: 'in_progress',
            label: 'Move To In Progress',
            requiresData: ['assignedFixerId'],
          },
          { action: 'cancelled', label: 'Cancel Job', requiresData: ['reason'] },
          { action: 'expired', label: 'Expire Job', requiresData: [] }
        );
        break;
      case 'in_progress':
        actions.push(
          { action: 'completed', label: 'Mark Completed', requiresData: ['completionNotes'] },
          { action: 'cancelled', label: 'Cancel Job', requiresData: ['reason'] },
          { action: 'disputed', label: 'Raise Dispute', requiresData: ['disputeReason'] }
        );
        break;
      case 'completed':
        actions.push({
          action: 'disputed',
          label: 'Raise Dispute',
          requiresData: ['disputeReason'],
        });
        break;
      case 'disputed':
        actions.push(
          { action: 'in_progress', label: 'Resume In Progress', requiresData: [] },
          { action: 'completed', label: 'Resolve As Completed', requiresData: [] },
          { action: 'cancelled', label: 'Cancel Job', requiresData: ['reason'] }
        );
        break;
      case 'expired':
        actions.push({ action: 'open', label: 'Reopen Job', requiresData: [] });
        break;
      default:
        break;
    }

    return actions;
  }

  if (isJobCreator) {
    switch (job.status) {
      case 'open':
        actions.push(
          { action: 'in_progress', label: 'Assign And Start', requiresData: ['assignedFixerId'] },
          { action: 'cancelled', label: 'Cancel Job', requiresData: ['reason'] }
        );
        break;
      case 'in_progress':
        actions.push(
          { action: 'cancelled', label: 'Cancel Job', requiresData: ['reason'] },
          { action: 'disputed', label: 'Raise Dispute', requiresData: ['disputeReason'] }
        );
        break;
      case 'completed':
        actions.push({
          action: 'disputed',
          label: 'Raise Dispute',
          requiresData: ['disputeReason'],
        });
        break;
      case 'expired':
        actions.push({ action: 'open', label: 'Reopen Job', requiresData: [] });
        break;
      default:
        break;
    }
  }

  if (isAssignedFixer) {
    switch (job.status) {
      case 'in_progress':
        actions.push(
          { action: 'completed', label: 'Mark Completed', requiresData: ['completionNotes'] },
          { action: 'disputed', label: 'Raise Dispute', requiresData: ['disputeReason'] }
        );
        break;
      case 'completed':
        actions.push({
          action: 'disputed',
          label: 'Raise Dispute',
          requiresData: ['disputeReason'],
        });
        break;
      default:
        break;
    }
  }

  return actions;
}

export async function publishJobStatusUpdate(
  jobId: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const ably = getServerAbly();
    if (!ably) {
      return;
    }

    const channel = ably.channels.get(CHANNELS.jobUpdates(jobId));
    await channel.publish(EVENTS.JOB_STATUS_CHANGED, payload);
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to publish job status update');
  }
}
