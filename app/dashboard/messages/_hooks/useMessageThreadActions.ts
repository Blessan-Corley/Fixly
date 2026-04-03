'use client';

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { useSendMessageMutation } from '@/hooks/query/messages';
import { fetcher, toSearchParams } from '@/hooks/query/shared';

import { isAbortError, normalizeMessage } from '../_lib/normalizers';
import type { Attachment, Message, MessageThread, SessionUserInfo } from '../_lib/types';

type SendMessageInput = {
  conversationId: string;
  content: string;
  attachments?: Attachment[];
  replyTo?: string;
};

type UseMessageThreadActionsOptions = {
  thread: MessageThread | null;
  queryConversationId: string;
  activeUser: SessionUserInfo | null;
  hasMore: boolean;
  currentPage: number;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
};

type UseMessageThreadActionsResult = {
  isSending: boolean;
  sendMessage: (
    input:
      | SendMessageInput
      | {
          text: string;
          attachments?: Attachment[];
          replyTo?: string | null;
          editingMessageId?: string | null;
        }
  ) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (conversationId?: string) => Promise<void>;
  updateMessage: (messageId: string, action: 'edit' | 'delete', content?: string) => Promise<void>;
  toggleReaction: (messageId: string, reactionType: string) => Promise<void>;
};

export function useMessageThreadActions({
  thread,
  queryConversationId,
  activeUser,
  hasMore,
  currentPage,
  setMessages,
  setCurrentPage,
  setHasMore,
}: UseMessageThreadActionsOptions): UseMessageThreadActionsResult & { isSending: boolean } {
  const updateAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const markReadAbortRef = useRef<AbortController | null>(null);
  const sendMutation = useSendMessageMutation();
  const isSending = sendMutation.isPending;

  const sendMessage = useCallback(
    async (
      input:
        | SendMessageInput
        | {
            text: string;
            attachments?: Attachment[];
            replyTo?: string | null;
            editingMessageId?: string | null;
          }
    ): Promise<void> => {
      const normalizedInput =
        'conversationId' in input
          ? input
          : {
              conversationId: thread?._id || queryConversationId,
              content: input.text,
              attachments: input.attachments,
              replyTo: input.replyTo ?? undefined,
            };

      if (
        !activeUser ||
        !normalizedInput.conversationId ||
        (!normalizedInput.content.trim() && !normalizedInput.attachments?.length)
      ) {
        return;
      }

      const optimisticMessageId = `temp-${Date.now()}`;
      const optimisticMessage = {
        _id: optimisticMessageId,
        sender: {
          _id: activeUser.id,
          name: activeUser.name,
          username: activeUser.username,
          photoURL: activeUser.image,
          isOnline: true,
          ratingAverage: null,
        },
        content: normalizedInput.content,
        timestamp: new Date().toISOString(),
        edited: false,
        deleted: false,
        messageType: normalizedInput.attachments?.length ? 'file' : 'text',
        readBy: { [activeUser.id]: new Date().toISOString() },
        attachments: normalizedInput.attachments ?? [],
        reactions: [],
        replyTo: normalizedInput.replyTo,
      } satisfies Message;

      setMessages((previous) => [...previous, optimisticMessage]);

      try {
        const response = await sendMutation.mutateAsync({
          conversationId: normalizedInput.conversationId,
          content: normalizedInput.content,
          messageType: normalizedInput.attachments?.length ? 'file' : 'text',
          attachments: normalizedInput.attachments,
          replyTo: normalizedInput.replyTo,
        });

        const persisted = normalizeMessage(response.message);
        setMessages((previous) =>
          previous.map((message) => (message._id === optimisticMessageId ? persisted : message))
        );
      } catch (error: unknown) {
        setMessages((previous) =>
          previous.filter((message) => message._id !== optimisticMessageId)
        );
        if (!isAbortError(error)) {
          toast.error(error instanceof Error ? error.message : 'Failed to send message');
        }
      }
    },
    [activeUser, queryConversationId, sendMutation, thread?._id, setMessages]
  );

  const loadMore = useCallback(async (): Promise<void> => {
    const nextConversationId = thread?._id || queryConversationId;
    if (!nextConversationId || !hasMore) return;

    if (loadMoreAbortRef.current) loadMoreAbortRef.current.abort();
    const abortController = new AbortController();
    loadMoreAbortRef.current = abortController;

    try {
      const params = toSearchParams({ page: currentPage + 1, limit: 30 });
      const payload = await fetcher<Record<string, unknown>>(
        `/api/messages/conversations/${nextConversationId}?${params.toString()}`,
        { signal: abortController.signal }
      );
      const nextItems = Array.isArray(payload.items) ? payload.items.map(normalizeMessage) : [];
      setMessages((previous) => [...nextItems, ...previous]);
      setCurrentPage(typeof payload.page === 'number' ? payload.page : currentPage + 1);
      setHasMore(Boolean(payload.hasMore));
    } catch (error: unknown) {
      if (!isAbortError(error)) toast.error('Failed to load older messages');
    }
  }, [currentPage, hasMore, queryConversationId, thread?._id, setMessages, setCurrentPage, setHasMore]);

  const markAsRead = useCallback(async (targetConversationId?: string): Promise<void> => {
    const conversationToMark = targetConversationId || thread?._id || queryConversationId;
    if (!conversationToMark) return;

    if (markReadAbortRef.current) markReadAbortRef.current.abort();
    const abortController = new AbortController();
    markReadAbortRef.current = abortController;

    try {
      await fetcher('/api/messages', {
        method: 'PATCH',
        body: JSON.stringify({ conversationId: conversationToMark }),
        signal: abortController.signal,
      });
    } catch (error: unknown) {
      if (!isAbortError(error)) toast.error('Failed to mark messages as read');
    }
  }, [queryConversationId, thread?._id]);

  const updateMessage = useCallback(
    async (messageId: string, action: 'edit' | 'delete', content = ''): Promise<void> => {
      const targetConversationId = thread?._id || queryConversationId;
      if (!targetConversationId || !messageId) return;

      if (updateAbortRef.current) updateAbortRef.current.abort();
      const abortController = new AbortController();
      updateAbortRef.current = abortController;

      try {
        const response = await fetcher<Record<string, unknown>>('/api/messages', {
          method: 'PUT',
          body: JSON.stringify({ conversationId: targetConversationId, messageId, action, content }),
          signal: abortController.signal,
        });
        const updatedMessage = normalizeMessage(response.updatedMessage);
        setMessages((previous) =>
          previous.map((message) =>
            message._id === updatedMessage._id ? updatedMessage : message
          )
        );
      } catch (error: unknown) {
        if (!isAbortError(error)) toast.error(`Failed to ${action} message`);
      }
    },
    [queryConversationId, thread?._id, setMessages]
  );

  const toggleReaction = useCallback(
    async (messageId: string, reactionType: string): Promise<void> => {
      const targetConversationId = thread?._id || queryConversationId;
      if (!targetConversationId || !messageId) return;

      try {
        const response = await fetcher<Record<string, unknown>>('/api/messages/reactions', {
          method: 'POST',
          body: JSON.stringify({ conversationId: targetConversationId, messageId, reactionType }),
        });
        const updatedMessage = normalizeMessage(response.updatedMessage);
        setMessages((previous) =>
          previous.map((message) =>
            message._id === updatedMessage._id ? updatedMessage : message
          )
        );
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to update reaction');
      }
    },
    [queryConversationId, thread?._id, setMessages]
  );

  return { isSending, sendMessage, loadMore, markAsRead, updateMessage, toggleReaction };
}
