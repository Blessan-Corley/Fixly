import { getServerAbly, CHANNELS } from '@/lib/ably';
import { logger } from '@/lib/logger';
import { invalidateCache } from '@/lib/redisCache';

export type CommentRouteContext = {
  params: Promise<{ jobId: string; commentId: string }>;
};

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

export async function invalidateJobCommentCaches(jobId: string): Promise<void> {
  const patterns = [`/api/jobs/${jobId}/comments`, `/api/jobs/${jobId}`];
  await Promise.allSettled(patterns.map((pattern) => invalidateCache(pattern)));
}

export async function publishCommentChannelEvent(
  jobId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const ably = getServerAbly();
    if (!ably) return;
    const channel = ably.channels.get(CHANNELS.jobComments(jobId));
    await channel.publish(event, payload);
  } catch (error) {
    logger.error('Failed to publish comment channel event:', error);
  }
}
