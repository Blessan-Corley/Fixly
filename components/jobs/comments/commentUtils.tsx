import type { ReactNode } from 'react';

import type { AppUser, ReactionItem } from './types';

export const COMMENT_REACTIONS = [
  { type: 'thumbs_up', emoji: '👍' },
  { type: 'heart', emoji: '❤️' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'thumbs_down', emoji: '👎' },
  { type: 'angry', emoji: '😡' },
] as const;

export const getCurrentUserId = (user?: AppUser | null): string => user?._id ?? user?.id ?? '';

export const formatTimeAgo = (value?: string | Date): string => {
  if (!value) return 'now';

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'now';

  const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 604800)}w`;
};

export const renderMentionText = (text: string): ReactNode[] =>
  text.split(' ').map((word, index, parts) => (
    <span key={`${word}-${index}`}>
      {word.startsWith('@') ? <span className="font-medium text-fixly-accent">{word}</span> : word}
      {index < parts.length - 1 ? ' ' : ''}
    </span>
  ));

export const getReactionCount = (reactions: ReactionItem[] | undefined, type: string): number =>
  Array.isArray(reactions) ? reactions.filter((r) => r.type === type).length : 0;

export const getUserReaction = (
  reactions: ReactionItem[] | undefined,
  currentUserId: string
): string | null => {
  if (!Array.isArray(reactions) || !currentUserId) return null;
  return reactions.find((r) => r.user === currentUserId)?.type ?? null;
};

export const sanitizeMentionToken = (value: string): string =>
  value.replace(/[^\w.-]/g, '').toLowerCase();
