import { CHANNELS, EVENTS, getServerAbly } from '@/lib/ably';
import { logger } from '@/lib/logger';

type JobCountsUpdate = {
  applicationCount?: number;
  commentCount?: number;
  type?: 'job_counts_updated' | 'view_count';
  viewCount?: number;
};

function toFiniteCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.floor(value));
}

export async function publishJobCountsUpdate(
  jobId: string,
  payload: JobCountsUpdate
): Promise<void> {
  try {
    const ably = getServerAbly();
    if (!ably) {
      return;
    }

    const channel = ably.channels.get(CHANNELS.jobUpdates(jobId));
    await channel.publish(EVENTS.JOB_UPDATED, {
      type: payload.type || 'job_counts_updated',
      jobId,
      viewCount: toFiniteCount(payload.viewCount),
      commentCount: toFiniteCount(payload.commentCount),
      applicationCount: toFiniteCount(payload.applicationCount),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to publish job counts update');
  }
}
