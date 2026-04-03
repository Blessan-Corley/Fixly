'use client';

import { type Dispatch, type SetStateAction } from 'react';

import { useAblyChannel } from '@/contexts/AblyContext';
import { CHANNELS, EVENTS } from '@/lib/ably';

import type { JobComment, JobCommentReply, ReactionEntry } from './types';
import { normalizeLikeEntries } from './utils';

type RealtimeOptions = {
  validJobId: string | null;
  replaceCommentCollection: (updater: (current: JobComment[]) => JobComment[]) => void;
};

export function useJobCommentsRealtime({
  validJobId,
  replaceCommentCollection,
}: RealtimeOptions): void {
  useAblyChannel(
    validJobId ? CHANNELS.jobComments(validJobId) : null,
    EVENTS.COMMENT_POSTED,
    (message) => {
      const payload = (message.data || {}) as { comment?: JobComment } & JobComment;
      const comment = payload.comment?._id ? payload.comment : payload;

      if (!comment?._id) return;

      replaceCommentCollection((prev) => {
        if (prev.some((item) => item._id === comment._id)) return prev;
        return [comment, ...prev];
      });
    },
    [replaceCommentCollection, validJobId]
  );

  useAblyChannel(
    validJobId ? CHANNELS.jobComments(validJobId) : null,
    EVENTS.COMMENT_LIKED,
    (message) => {
      const payload = (message.data || {}) as {
        commentId?: string;
        replyId?: string;
        likes?: unknown;
      };

      replaceCommentCollection((prev) =>
        prev.map((comment) => {
          if (comment._id === payload.commentId) {
            return { ...comment, likes: normalizeLikeEntries(payload.likes, comment.likes) };
          }

          if (!comment.replies?.length) return comment;

          let replyChanged = false;
          const updatedReplies = comment.replies.map((reply) => {
            if (reply._id !== payload.replyId) return reply;
            replyChanged = true;
            return { ...reply, likes: normalizeLikeEntries(payload.likes, reply.likes) };
          });

          return replyChanged ? { ...comment, replies: updatedReplies } : comment;
        })
      );
    },
    [replaceCommentCollection, validJobId]
  );

  useAblyChannel(
    validJobId ? CHANNELS.jobComments(validJobId) : null,
    EVENTS.COMMENT_REACTED,
    (message) => {
      const payload = (message.data || {}) as {
        commentId?: string;
        replyId?: string;
        reactions?: ReactionEntry[];
      };

      replaceCommentCollection((prev) =>
        prev.map((comment) => {
          if (comment._id === payload.commentId && !payload.replyId) {
            return {
              ...comment,
              reactions: Array.isArray(payload.reactions) ? payload.reactions : comment.reactions,
            };
          }

          if (!comment.replies?.length) return comment;

          let replyChanged = false;
          const updatedReplies = comment.replies.map((reply) => {
            if (reply._id !== payload.replyId) return reply;
            replyChanged = true;
            return {
              ...reply,
              reactions: Array.isArray(payload.reactions) ? payload.reactions : reply.reactions,
            };
          });

          return replyChanged ? { ...comment, replies: updatedReplies } : comment;
        })
      );
    },
    [replaceCommentCollection, validJobId]
  );

  useAblyChannel(
    validJobId ? CHANNELS.jobComments(validJobId) : null,
    EVENTS.COMMENT_REPLIED,
    (message) => {
      const payload = (message.data || {}) as { commentId?: string; reply?: JobCommentReply };
      const reply = payload.reply;
      if (!payload.commentId || !reply?._id) return;

      replaceCommentCollection((prev) =>
        prev.map((comment) => {
          if (comment._id !== payload.commentId) return comment;

          const replies = comment.replies ?? [];
          if (replies.some((r) => r._id === payload.reply?._id)) return comment;

          return { ...comment, replies: [...replies, reply] };
        })
      );
    },
    [replaceCommentCollection, validJobId]
  );

  useAblyChannel(
    validJobId ? CHANNELS.jobComments(validJobId) : null,
    EVENTS.COMMENT_EDITED,
    (message) => {
      const payload = (message.data || {}) as {
        commentId?: string;
        replyId?: string;
        editedContent?: string;
        timestamp?: string;
      };

      replaceCommentCollection((prev) =>
        prev.map((comment) => {
          if (comment._id === payload.commentId && !payload.replyId) {
            return {
              ...comment,
              message: payload.editedContent ?? comment.message,
              edited: {
                isEdited: true,
                editedAt: payload.timestamp ?? new Date().toISOString(),
              },
            };
          }

          if (!comment.replies?.length) return comment;

          let replyChanged = false;
          const updatedReplies = comment.replies.map((reply) => {
            if (reply._id !== payload.replyId) return reply;
            replyChanged = true;
            return {
              ...reply,
              message: payload.editedContent ?? reply.message,
              edited: {
                isEdited: true,
                editedAt: payload.timestamp ?? new Date().toISOString(),
              },
            };
          });

          return replyChanged ? { ...comment, replies: updatedReplies } : comment;
        })
      );
    },
    [replaceCommentCollection, validJobId]
  );

  useAblyChannel(
    validJobId ? CHANNELS.jobComments(validJobId) : null,
    EVENTS.COMMENT_DELETED,
    (message) => {
      const payload = (message.data || {}) as { commentId?: string; replyId?: string };

      replaceCommentCollection((prev) => {
        if (payload.replyId) {
          return prev.map((comment) => {
            if (comment._id !== payload.commentId) return comment;
            return {
              ...comment,
              replies: (comment.replies ?? []).filter((r) => r._id !== payload.replyId),
            };
          });
        }
        return prev.filter((comment) => comment._id !== payload.commentId);
      });
    },
    [replaceCommentCollection, validJobId]
  );
}
