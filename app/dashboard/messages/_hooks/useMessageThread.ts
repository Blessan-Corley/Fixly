'use client';

import { useEffect, useState } from 'react';

import {
  useJobMessageThreadQuery,
  useMessageThreadQuery,
} from '@/hooks/query/messages';

import { isRecord, normalizeThread } from '../_lib/normalizers';
import type { Message, MessageThread, SessionUserInfo } from '../_lib/types';

import { useMessageThreadActions } from './useMessageThreadActions';

type UseMessageThreadOptions = {
  conversationId?: string | null;
  jobId?: string | null;
  sessionUser?: SessionUserInfo | null;
  currentUser?: SessionUserInfo | null;
  enabled?: boolean;
  onConversationResolved?: (conversation: MessageThread) => void;
};

type UseMessageThreadResult = {
  thread: MessageThread | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  hasMore: boolean;
  currentPage: number;
  sendMessage: (
    input:
      | { conversationId: string; content: string; attachments?: import('../_lib/types').Attachment[]; replyTo?: string }
      | { text: string; attachments?: import('../_lib/types').Attachment[]; replyTo?: string | null; editingMessageId?: string | null }
  ) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (conversationId?: string) => Promise<void>;
  updateMessage: (messageId: string, action: 'edit' | 'delete', content?: string) => Promise<void>;
  toggleReaction: (messageId: string, reactionType: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, reactionType: string) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setThread: React.Dispatch<React.SetStateAction<MessageThread | null>>;
};

export function useMessageThread(options: UseMessageThreadOptions): UseMessageThreadResult {
  const {
    conversationId,
    jobId,
    sessionUser,
    currentUser,
    enabled = true,
    onConversationResolved,
  } = options;

  const activeUser = sessionUser ?? currentUser ?? null;
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const queryConversationId = conversationId ?? '';
  const effectiveJobId = !queryConversationId ? jobId ?? '' : '';

  const threadQuery = useMessageThreadQuery(queryConversationId, {
    enabled: enabled && Boolean(queryConversationId),
  });
  const jobThreadQuery = useJobMessageThreadQuery(effectiveJobId, {
    enabled: enabled && Boolean(effectiveJobId),
  });
  const activeQuery = queryConversationId ? threadQuery : jobThreadQuery;

  useEffect(() => {
    const payload = activeQuery.data;
    if (!payload) {
      if (!queryConversationId && !effectiveJobId) {
        setThread(null);
        setMessages([]);
        setCurrentPage(1);
        setHasMore(false);
      }
      return;
    }

    const conversationSource = isRecord(payload.conversation) ? payload.conversation : {};
    const normalizedThread = normalizeThread({
      ...conversationSource,
      messages: Array.isArray(payload.items) ? payload.items : [],
    });

    setThread(normalizedThread);
    setMessages(normalizedThread.messages);
    setCurrentPage(typeof payload.page === 'number' ? payload.page : 1);
    setHasMore(Boolean(payload.hasMore));
    onConversationResolved?.(normalizedThread);
  }, [activeQuery.data, effectiveJobId, onConversationResolved, queryConversationId]);

  const { isSending, sendMessage, loadMore, markAsRead, updateMessage, toggleReaction } =
    useMessageThreadActions({
      thread,
      queryConversationId,
      activeUser,
      hasMore,
      currentPage,
      setMessages,
      setCurrentPage,
      setHasMore,
    });

  return {
    thread,
    messages,
    isLoading: activeQuery.isLoading,
    isSending,
    hasMore,
    currentPage,
    sendMessage,
    loadMore,
    markAsRead,
    updateMessage,
    toggleReaction,
    deleteMessage: async (messageId: string) => { await updateMessage(messageId, 'delete'); },
    reactToMessage: toggleReaction,
    setMessages,
    setThread,
  };
}
