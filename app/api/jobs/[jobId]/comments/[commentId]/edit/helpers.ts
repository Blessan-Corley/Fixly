import { z } from 'zod';

import { logger } from '@/lib/logger';
import { sendTemplatedNotification } from '@/lib/services/notifications';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

import { isValidObjectId } from '../../../route.shared';

export type Mention = {
  user: string;
  startIndex: number;
  endIndex: number;
};

export type EditBody = {
  message?: unknown;
  replyId?: unknown;
  mentions?: unknown;
};

export type EditResult = {
  success?: boolean;
  message?: string;
  reply?: unknown;
  comment?: unknown;
};

export type EditHistoryState = {
  isEdited?: boolean;
  editedAt?: Date | string;
  editHistory?: unknown[];
};

export type ReplyEntry = {
  _id?: unknown;
  edited?: EditHistoryState;
};

export type CommentEntry = {
  _id?: unknown;
  replies?: ReplyEntry[];
  edited?: EditHistoryState;
};

export type JobCommentsProjection = {
  comments?: CommentEntry[];
};

export type JobEditActions = {
  editReply(
    commentId: string,
    replyId: string,
    userId: unknown,
    message: string,
    mentions: Mention[]
  ): EditResult;
  editComment(
    commentId: string,
    userId: unknown,
    message: string,
    mentions: Mention[]
  ): EditResult;
};

export const EditBodySchema: z.ZodType<EditBody> = z.object({
  message: z.unknown().optional(),
  replyId: z.unknown().optional(),
  mentions: z.unknown().optional(),
});

export function sanitizeMessage(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeMentions(value: unknown): Mention[] {
  if (!Array.isArray(value)) return [];
  const mentions: Mention[] = [];
  for (const raw of value.slice(0, 20)) {
    const entry = raw as Record<string, unknown>;
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

export type ModerationOutcome =
  | { allowed: false; message: string | undefined; violations: unknown[] | undefined }
  | { allowed: true; content: string };

export async function runMessageModeration(
  message: string,
  replyId: string,
  mentions: Mention[],
  userId: string
): Promise<ModerationOutcome> {
  const result = await moderateUserGeneratedContent(message, {
    context: 'comment',
    fieldLabel: replyId ? 'Reply' : 'Comment',
    userId,
    allowRanges: mentions.map((m) => ({ startIndex: m.startIndex, endIndex: m.endIndex })),
  });
  if (!result.allowed) {
    return { allowed: false, message: result.message ?? undefined, violations: result.violations ?? undefined };
  }
  return { allowed: true, content: result.content };
}

export async function sendMentionNotifications(
  mentions: Mention[],
  selfId: string,
  senderName: string,
  jobId: string,
  commentId: string
): Promise<void> {
  for (const mention of mentions) {
    if (mention.user === selfId) continue;
    try {
      await sendTemplatedNotification(
        'COMMENT_REPLY',
        mention.user,
        { replierName: senderName, jobId, commentId },
        { senderId: selfId, priority: 'medium' }
      );
    } catch (error) {
      logger.error('Failed to send mention notification:', error);
    }
  }
}
