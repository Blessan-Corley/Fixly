import { z } from 'zod';

import { getServerAbly, CHANNELS, EVENTS } from '@/lib/ably';
import { notFound, respond } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { invalidateCache, withCache } from '@/lib/redisCache';
import Job from '@/models/Job';

import { getValidatedJobId, isValidObjectId, type JobRouteContext } from '../../route.shared';

export { EVENTS };

export type SessionUser = {
  id?: string;
  name?: string;
};

export type CommentBody = {
  message?: unknown;
  mentions?: unknown;
};

export type ReplyBody = {
  commentId?: unknown;
  message?: unknown;
  mentions?: unknown;
};

export type DeleteBody = {
  commentId?: unknown;
  replyId?: unknown;
};

export type JobCommentsProjection = {
  comments?: unknown[];
  updatedAt?: Date | string;
};

export type DeleteCommentResult = {
  success?: boolean;
  message?: string;
};

export type JobCommentActions = {
  deleteReply: (commentId: string, replyId: string, userId: unknown) => DeleteCommentResult;
  deleteComment: (commentId: string, userId: unknown) => DeleteCommentResult;
};

export type Mention = {
  user: string;
  startIndex: number;
  endIndex: number;
};

export const mentionSchema = z.object({
  user: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
});

export const commentBodySchema = z.object({
  message: z.unknown().optional(),
  mentions: z.array(mentionSchema).optional(),
});

export const replyBodySchema = z.object({
  commentId: z.unknown().optional(),
  message: z.unknown().optional(),
  mentions: z.array(mentionSchema).optional(),
});

export const deleteBodySchema = z.object({
  commentId: z.unknown().optional(),
  replyId: z.unknown().optional(),
});

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

export function sanitizeMessage(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeMentions(value: unknown): Mention[] {
  if (!Array.isArray(value)) return [];

  const mentions: Mention[] = [];
  for (const raw of value.slice(0, 20)) {
    const entry = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null;
    const user = typeof entry?.user === 'string' ? entry.user.trim() : '';
    const startIndex = Number(entry?.startIndex);
    const endIndex = Number(entry?.endIndex);

    if (!user || !isValidObjectId(user)) continue;
    if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) continue;
    if (startIndex < 0 || endIndex < startIndex) continue;

    mentions.push({ user, startIndex, endIndex });
  }

  return mentions;
}

export async function publishCommentEvent(
  jobId: string,
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const ably = getServerAbly();
    if (!ably) return;
    const channel = ably.channels.get(CHANNELS.jobComments(jobId));
    await channel.publish(eventName, payload);
  } catch (error) {
    logger.error(`Failed to publish ${eventName} event:`, error);
  }
}

export async function invalidateJobCommentCaches(jobId: string): Promise<void> {
  const patterns = [`/api/jobs/${jobId}/comments`, `/api/jobs/${jobId}`];
  const results = await Promise.allSettled(patterns.map((pattern) => invalidateCache(pattern)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn(`Failed to invalidate cache pattern ${patterns[index]}:`, result.reason);
    }
  });
}

export function getUserPhotoUrl(user: unknown): string | undefined {
  if (!user || typeof user !== 'object') return undefined;
  const record = user as Record<string, unknown>;
  return typeof record.photoURL === 'string' ? record.photoURL : undefined;
}

export const getCommentsCached = withCache<JobRouteContext>(
  async (_request: Request, segmentData: JobRouteContext): Promise<Response> => {
    const params = await segmentData.params;
    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }
    const { jobId } = jobIdResult;

    await connectDB();

    const job = await Job.findById(jobId)
      .select('comments updatedAt')
      .populate({ path: 'comments.author', select: 'name username photoURL' })
      .populate({ path: 'comments.replies.author', select: 'name username photoURL' })
      .lean<JobCommentsProjection | null>();

    if (!job) {
      return notFound('Job');
    }

    return respond({
      success: true,
      comments: job.comments ?? [],
      lastUpdated: job.updatedAt,
    });
  },
  { ttl: 5, version: 'v2' }
);
