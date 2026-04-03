import { z } from 'zod';

import { logger } from '@/lib/logger';
import { sendTemplatedNotification } from '@/lib/services/notifications';

import { toIdString } from '../shared';

export const ALLOWED_REACTIONS = new Set([
  'thumbs_up',
  'thumbs_down',
  'heart',
  'laugh',
  'wow',
  'angry',
]);

export type ReactionEntry = {
  user?: unknown;
  type?: string;
};

export type ReplyEntry = {
  _id?: unknown;
  author?: unknown;
  reactions?: ReactionEntry[];
};

export type CommentEntry = {
  _id?: unknown;
  author?: unknown;
  reactions?: ReactionEntry[];
  replies?: ReplyEntry[];
};

export type JobCommentsProjection = {
  comments?: CommentEntry[];
};

export type ReactionToggleResult = {
  reacted?: boolean;
  reactionType?: string;
  count?: number;
};

export type JobWithReactionActions = {
  _id?: unknown;
  comments: {
    id: (id: string) => CommentEntry | null | undefined;
  };
  toggleReplyReaction(
    commentId: string,
    replyId: string,
    userId: unknown,
    reactionType: string
  ): ReactionToggleResult | null;
  toggleCommentReaction(
    commentId: string,
    userId: unknown,
    reactionType: string
  ): ReactionToggleResult | null;
  save(): Promise<unknown>;
};

export const CommentReactionSchema = z.object({
  reactionType: z.string().optional(),
  emoji: z.string().optional(),
  replyId: z.string().optional(),
});

export function buildReactionCounts(reactions: ReactionEntry[]): Record<string, number> {
  return reactions.reduce((counts: Record<string, number>, reaction) => {
    const key = String(reaction?.type ?? '');
    if (!key) return counts;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export type ReactionTarget = {
  result: ReactionToggleResult;
  targetAuthor: unknown;
  reactions: ReactionEntry[];
};

export function resolveReactionTarget(
  reactableJob: JobWithReactionActions,
  commentId: string,
  replyId: string,
  userId: unknown,
  reactionType: string
): ReactionTarget | null {
  if (replyId) {
    const result = reactableJob.toggleReplyReaction(commentId, replyId, userId, reactionType);
    if (!result) return null;
    const comment = reactableJob.comments.id(commentId);
    const reply = comment?.replies?.find((entry) => String(entry?._id) === replyId);
    return {
      result,
      targetAuthor: reply?.author,
      reactions: Array.isArray(reply?.reactions) ? reply.reactions : [],
    };
  }
  const result = reactableJob.toggleCommentReaction(commentId, userId, reactionType);
  if (!result) return null;
  const comment = reactableJob.comments.id(commentId);
  return {
    result,
    targetAuthor: comment?.author,
    reactions: Array.isArray(comment?.reactions) ? comment.reactions : [],
  };
}

export async function sendReactionNotification(
  targetAuthor: unknown,
  reactorId: unknown,
  reactorName: string,
  jobId: string,
  commentId: string
): Promise<void> {
  if (!targetAuthor || toIdString(targetAuthor) === toIdString(reactorId)) return;
  try {
    await sendTemplatedNotification(
      'COMMENT_LIKE',
      toIdString(targetAuthor),
      { likerName: reactorName, jobId, commentId },
      { senderId: toIdString(reactorId), priority: 'low' }
    );
  } catch (error) {
    logger.error('Failed to send reaction notification:', error);
  }
}
