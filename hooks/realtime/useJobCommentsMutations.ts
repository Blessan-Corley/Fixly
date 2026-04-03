'use client';

import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';

type MutationOptions = {
  currentUserId: string | undefined;
  validJobId: string | null;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
};

type MutationResult = {
  postComment: (content: string, mentions?: unknown[]) => Promise<boolean>;
  postReply: (commentId: string, content: string, mentions?: unknown[]) => Promise<boolean>;
  likeComment: (commentId: string, replyId?: string) => Promise<boolean>;
  reactToComment: (commentId: string, reactionType: string, replyId?: string) => Promise<boolean>;
  editComment: (
    commentId: string,
    message: string,
    replyId?: string,
    mentions?: unknown[]
  ) => Promise<boolean>;
  deleteComment: (commentId: string, replyId?: string) => Promise<boolean>;
};

export function useJobCommentsMutations({
  currentUserId,
  validJobId,
  setIsLoading,
}: MutationOptions): MutationResult {
  const postComment = useCallback(
    async (content: string, mentions?: unknown[]) => {
      if (!currentUserId || !content.trim() || !validJobId) return false;

      try {
        setIsLoading(true);
        const response = await fetchWithCsrf(`/api/jobs/${validJobId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            ...(mentions ? { mentions } : {}),
          }),
        });

        if (!response.ok) return false;
        const result = (await response.json()) as { success?: boolean };
        return Boolean(result.success);
      } catch (error) {
        console.error('Failed to post comment:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentUserId, validJobId, setIsLoading]
  );

  const postReply = useCallback(
    async (commentId: string, content: string, mentions?: unknown[]) => {
      if (!currentUserId || !validJobId || !commentId || !content.trim()) return false;

      try {
        const response = await fetchWithCsrf(`/api/jobs/${validJobId}/comments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commentId,
            message: content.trim(),
            ...(mentions ? { mentions } : {}),
          }),
        });

        if (!response.ok) return false;
        const result = (await response.json()) as { success?: boolean };
        return Boolean(result.success);
      } catch (error) {
        console.error('Failed to post reply:', error);
        return false;
      }
    },
    [currentUserId, validJobId]
  );

  const likeComment = useCallback(
    async (commentId: string, replyId?: string) => {
      if (!currentUserId || !validJobId) return false;

      try {
        const response = await fetchWithCsrf(
          `/api/jobs/${validJobId}/comments/${commentId}/like`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(replyId ? { replyId } : {}),
          }
        );
        return response.ok;
      } catch (error) {
        console.error('Failed to like comment:', error);
        return false;
      }
    },
    [currentUserId, validJobId]
  );

  const reactToComment = useCallback(
    async (commentId: string, reactionType: string, replyId?: string) => {
      if (!currentUserId || !validJobId || !commentId || !reactionType.trim()) return false;

      try {
        const response = await fetchWithCsrf(
          `/api/jobs/${validJobId}/comments/${commentId}/react`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reactionType,
              ...(replyId ? { replyId } : {}),
            }),
          }
        );
        return response.ok;
      } catch (error) {
        console.error('Failed to react to comment:', error);
        return false;
      }
    },
    [currentUserId, validJobId]
  );

  const editComment = useCallback(
    async (commentId: string, message: string, replyId?: string, mentions?: unknown[]) => {
      if (!currentUserId || !validJobId || !commentId || !message.trim()) return false;

      try {
        const response = await fetchWithCsrf(
          `/api/jobs/${validJobId}/comments/${commentId}/edit`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message.trim(),
              ...(replyId ? { replyId } : {}),
              ...(mentions ? { mentions } : {}),
            }),
          }
        );
        return response.ok;
      } catch (error) {
        console.error('Failed to edit comment:', error);
        return false;
      }
    },
    [currentUserId, validJobId]
  );

  const deleteComment = useCallback(
    async (commentId: string, replyId?: string) => {
      if (!currentUserId || !validJobId || !commentId) return false;

      try {
        const response = await fetchWithCsrf(`/api/jobs/${validJobId}/comments`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commentId,
            ...(replyId ? { replyId } : {}),
          }),
        });
        return response.ok;
      } catch (error) {
        console.error('Failed to delete comment:', error);
        return false;
      }
    },
    [currentUserId, validJobId]
  );

  return { postComment, postReply, likeComment, reactToComment, editComment, deleteComment };
}
