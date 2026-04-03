import { useMemo } from 'react';

import { sanitizeMentionToken } from './commentUtils';
import type { CommentAuthor, CommentItem, MentionPayload } from './types';

export function useCommentMentions(comments: CommentItem[], currentUserId: string) {
  const mentionCandidates = useMemo(() => {
    const candidates = new Map<string, { userId: string; username: string }>();

    const addCandidate = (author?: CommentAuthor) => {
      const userId = author?._id ?? '';
      const username = author?.username?.trim() ?? '';
      if (!userId || !username || userId === currentUserId) return;
      candidates.set(username.toLowerCase(), { userId, username });
    };

    comments.forEach((comment) => {
      addCandidate(comment.author);
      (comment.replies ?? []).forEach((reply) => addCandidate(reply.author));
    });

    return candidates;
  }, [comments, currentUserId]);

  const extractMentions = (content: string): MentionPayload[] => {
    const mentions: MentionPayload[] = [];
    const seen = new Set<string>();
    const matcher = /@([\w.-]+)/g;

    let match = matcher.exec(content);
    while (match) {
      const username = sanitizeMentionToken(match[1] ?? '');
      const candidate = mentionCandidates.get(username);
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      if (candidate) {
        const key = `${candidate.userId}:${startIndex}:${endIndex}`;
        if (!seen.has(key)) {
          mentions.push({ user: candidate.userId, startIndex, endIndex });
          seen.add(key);
        }
      }

      match = matcher.exec(content);
    }

    return mentions;
  };

  return { mentionCandidates, extractMentions };
}
