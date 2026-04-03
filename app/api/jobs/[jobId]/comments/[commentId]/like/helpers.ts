import { z } from 'zod';

import { logger } from '@/lib/logger';
import { sendTemplatedNotification } from '@/lib/services/notifications';

import { toIdString } from '../shared';

export type LikeEntry = {
  user?: unknown;
};

export type ReplyEntry = {
  _id?: unknown;
  author?: unknown;
  likes?: LikeEntry[];
};

export type CommentEntry = {
  _id?: unknown;
  author?: unknown;
  likes?: LikeEntry[];
  replies?: ReplyEntry[];
};

export type JobCommentsProjection = {
  comments?: CommentEntry[];
};

export type ToggleLikeResult = {
  liked?: boolean;
  likeCount?: number;
};

export type JobWithLikeActions = {
  _id?: unknown;
  comments: {
    id: (id: string) => CommentEntry | null | undefined;
  };
  toggleReplyLike(commentId: string, replyId: string, userId: unknown): ToggleLikeResult | null;
  toggleCommentLike(commentId: string, userId: unknown): ToggleLikeResult | null;
  save(): Promise<unknown>;
};

export const CommentLikeParamsSchema = z.object({
  jobId: z.string().min(1),
  commentId: z.string().min(1),
});

export const LikeBodySchema = z.object({
  replyId: z.unknown().optional(),
});

export type LikeTarget = {
  result: ToggleLikeResult;
  targetAuthor: unknown;
  likes: LikeEntry[];
};

export function resolveLikeTarget(
  likeableJob: JobWithLikeActions,
  commentId: string,
  replyId: string,
  userId: unknown
): LikeTarget | null {
  if (replyId) {
    const result = likeableJob.toggleReplyLike(commentId, replyId, userId);
    if (!result) return null;
    const comment = likeableJob.comments.id(commentId);
    const reply = comment?.replies?.find((entry) => String(entry?._id) === replyId);
    return {
      result,
      targetAuthor: reply?.author,
      likes: Array.isArray(reply?.likes) ? reply.likes : [],
    };
  }
  const result = likeableJob.toggleCommentLike(commentId, userId);
  if (!result) return null;
  const comment = likeableJob.comments.id(commentId);
  return {
    result,
    targetAuthor: comment?.author,
    likes: Array.isArray(comment?.likes) ? comment.likes : [],
  };
}

export async function sendLikeNotification(
  targetAuthor: unknown,
  likerId: unknown,
  likerName: string,
  jobId: string,
  commentId: string
): Promise<void> {
  if (!targetAuthor || toIdString(targetAuthor) === toIdString(likerId)) return;
  try {
    await sendTemplatedNotification(
      'COMMENT_LIKE',
      toIdString(targetAuthor),
      { likerName, jobId, commentId },
      { senderId: toIdString(likerId), priority: 'low' }
    );
  } catch (error) {
    logger.error('Failed to send comment-like notification:', error);
  }
}
