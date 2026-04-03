'use client';

import { useOptimistic } from 'react';

import {
  COMMENT_REACTIONS,
  getReactionCount,
  getUserReaction,
} from './commentUtils';
import type { ReactionItem } from './types';

interface CommentReactionsProps {
  id: string;
  reactions?: ReactionItem[];
  currentUserId: string;
  onReact: (type: string) => void;
  size?: 'sm' | 'xs';
}

export function CommentReactions({
  id,
  reactions,
  currentUserId,
  onReact,
  size = 'sm',
}: CommentReactionsProps) {
  const textSize = size === 'xs' ? 'text-[11px]' : 'text-xs';

  const [optimisticReactions, applyOptimisticReaction] = useOptimistic(
    reactions ?? [],
    (current: ReactionItem[], reactionType: string) => {
      const existing = current.find((r) => r.user === currentUserId);
      if (existing?.type === reactionType) {
        return current.filter((r) => r.user !== currentUserId);
      }
      const without = current.filter((r) => r.user !== currentUserId);
      return [...without, { type: reactionType, user: currentUserId }];
    }
  );

  function handleReact(type: string) {
    applyOptimisticReaction(type);
    onReact(type);
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {COMMENT_REACTIONS.map((reaction) => {
        const count = getReactionCount(optimisticReactions, reaction.type);
        const isSelected = getUserReaction(optimisticReactions, currentUserId) === reaction.type;

        return (
          <button
            key={`${id}-${reaction.type}`}
            onClick={() => handleReact(reaction.type)}
            className={`rounded-full border px-2 py-1 ${textSize} transition-colors ${
              isSelected || count > 0
                ? 'border-fixly-accent bg-fixly-accent/10 text-fixly-accent'
                : 'border-fixly-border text-fixly-text-muted hover:border-fixly-accent'
            }`}
          >
            <span>{reaction.emoji}</span>
            {count > 0 && <span className="ml-1">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
