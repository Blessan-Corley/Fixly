'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Channels, Events, type TypingPayload } from '@/lib/ably/events';
import { useAblyEvent } from '@/lib/ably/hooks';

import type { Message, MessageReactionOption } from '../_lib/types';

import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

type MessageThreadProps = {
  conversationId: string;
  messages: Message[];
  currentUserId: string;
  selectedOtherParticipantId?: string;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReact: (messageId: string, reactionType: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReply: (messageId: string) => void;
  reactionOptions: MessageReactionOption[];
};

type MessageGroup = { label: string; messages: Message[] };
type TypingUser = { userId: string; userName: string };

function toDateLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
  selectedOtherParticipantId,
  isLoading,
  hasMore,
  onLoadMore,
  onReact,
  onEdit,
  onDelete,
  onReply,
  reactionOptions,
}: MessageThreadProps): React.JSX.Element {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const groupedMessages = useMemo<MessageGroup[]>(() => {
    const groups: MessageGroup[] = [];
    messages.forEach((message) => {
      const label = toDateLabel(message.timestamp);
      const currentGroup = groups[groups.length - 1];
      if (!currentGroup || currentGroup.label !== label) {
        groups.push({ label, messages: [message] });
      } else {
        currentGroup.messages.push(message);
      }
    });
    return groups;
  }, [messages]);

  useEffect(() => {
    return () => {
      Object.values(typingTimersRef.current).forEach((timer) => clearTimeout(timer));
      typingTimersRef.current = {};
    };
  }, []);

  useAblyEvent(
    conversationId ? Channels.conversation(conversationId) : '',
    Events.conversation.typingStarted,
    useCallback(
      (message) => {
        const payload =
          message.data && typeof message.data === 'object'
            ? (message.data as TypingPayload)
            : null;
        if (!payload?.userId || payload.userId === currentUserId) return;

        setTypingUsers((previous) => {
          if (previous.some((entry) => entry.userId === payload.userId)) {
            return previous.map((entry) =>
              entry.userId === payload.userId
                ? { userId: payload.userId, userName: payload.userName }
                : entry
            );
          }
          return [...previous, { userId: payload.userId, userName: payload.userName }];
        });

        if (typingTimersRef.current[payload.userId]) {
          clearTimeout(typingTimersRef.current[payload.userId]);
        }
        typingTimersRef.current[payload.userId] = setTimeout(() => {
          setTypingUsers((previous) =>
            previous.filter((entry) => entry.userId !== payload.userId)
          );
          delete typingTimersRef.current[payload.userId];
        }, 3000);
      },
      [currentUserId]
    ),
    Boolean(conversationId)
  );

  useAblyEvent(
    conversationId ? Channels.conversation(conversationId) : '',
    Events.conversation.typingStopped,
    useCallback((message) => {
      const payload =
        message.data && typeof message.data === 'object'
          ? (message.data as { userId?: string })
          : null;
      if (!payload?.userId) return;

      if (typingTimersRef.current[payload.userId]) {
        clearTimeout(typingTimersRef.current[payload.userId]);
        delete typingTimersRef.current[payload.userId];
      }
      setTypingUsers((previous) => previous.filter((entry) => entry.userId !== payload.userId));
    }, []),
    Boolean(conversationId)
  );

  if (isLoading && messages.length === 0) {
    return <div className="flex-1 p-6 text-fixly-text-light">Loading conversation...</div>;
  }

  return (
    <div className="bg-fixly-bg-light flex-1 overflow-y-auto p-4">
      {hasMore && (
        <div className="mb-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-full border border-fixly-border px-4 py-2 text-sm text-fixly-text-light hover:bg-fixly-card"
          >
            Load older messages
          </button>
        </div>
      )}

      <div className="space-y-6">
        {groupedMessages.map((group) => (
          <div key={group.label}>
            <div className="mb-4 text-center">
              <span className="rounded-full bg-fixly-card px-3 py-1 text-xs font-medium text-fixly-text-light">
                {group.label}
              </span>
            </div>
            <div className="space-y-4">
              {group.messages.map((message, index) => {
                const previousMessage = group.messages[index - 1];
                const showAvatar =
                  !previousMessage || previousMessage.sender._id !== message.sender._id;
                return (
                  <MessageBubble
                    key={message._id}
                    message={message}
                    currentUserId={currentUserId}
                    selectedOtherParticipantId={selectedOtherParticipantId}
                    messages={messages}
                    reactionOptions={reactionOptions}
                    showAvatar={showAvatar}
                    onReact={onReact}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onReply={onReply}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <TypingIndicator typingUsers={typingUsers} />
    </div>
  );
}
