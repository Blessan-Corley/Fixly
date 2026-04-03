'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAbly } from '@/contexts/AblyContext';

import type { JobComment } from './types';
import { isValidIdentifier } from './utils';
import { useJobCommentsMutations } from './useJobCommentsMutations';
import { useJobCommentsRealtime } from './useJobCommentsRealtime';

export function useJobComments(jobId: string | null | undefined): {
  comments: JobComment[];
  isLoading: boolean;
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
} {
  const { currentUser } = useAbly();
  const [comments, setComments] = useState<JobComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUserId = typeof currentUser?.id === 'string' ? currentUser.id : undefined;
  const validJobId = isValidIdentifier(jobId) ? jobId : null;

  useEffect(() => {
    if (!validJobId) {
      setComments([]);
      return;
    }

    setIsLoading(true);
    fetch(`/api/jobs/${validJobId}/comments`)
      .then((res) => res.json() as Promise<{ comments?: JobComment[] }>)
      .then((data) => {
        setComments(data.comments ?? []);
      })
      .catch((error) => {
        console.error('Failed to load comments:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [validJobId]);

  const replaceCommentCollection = useCallback(
    (updater: (current: JobComment[]) => JobComment[]) => {
      setComments((prev) => updater(prev));
    },
    []
  );

  useJobCommentsRealtime({ validJobId: validJobId ?? null, replaceCommentCollection });

  const mutations = useJobCommentsMutations({
    currentUserId,
    validJobId: validJobId ?? null,
    setIsLoading,
  });

  return { comments, isLoading, ...mutations };
}
