'use client';

import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react';

import { useAblyChannel } from '@/contexts/AblyContext';
import { CHANNELS, EVENTS } from '@/lib/ably';

import { isRecord, normalizeMessage, toStringSafe } from '../_lib/normalizers';
import type { Message } from '../_lib/types';

type UseMessagesRealtimeParams = {
  selectedConversationChannel: string | null;
  selectedConversationId: string;
  sessionUserId: string;
  userParam: string | null;
  conversationParam: string | null;
  setConversationParam: (value: string | null) => Promise<unknown>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  markAsRead: (conversationId: string) => Promise<void>;
  refreshConversationList: () => Promise<void>;
  setTypingUserName: (value: string | null) => void;
};

export function useMessagesRealtime({
  selectedConversationChannel,
  selectedConversationId,
  sessionUserId,
  userParam,
  conversationParam,
  setConversationParam,
  setMessages,
  markAsRead,
  refreshConversationList,
  setTypingUserName,
}: UseMessagesRealtimeParams): void {
  const typingIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useAblyChannel(
    selectedConversationChannel,
    EVENTS.MESSAGE_SENT,
    (ablyMessage) => {
      const payload = isRecord(ablyMessage.data) ? ablyMessage.data : {};
      const conversationId = toStringSafe(payload.conversationId);
      const incomingMessage = normalizeMessage(payload.message);
      if (!incomingMessage._id) return;

      if (conversationId === selectedConversationId) {
        setMessages((previous) => {
          const index = previous.findIndex((message) => message._id === incomingMessage._id);
          if (index >= 0) {
            const next = [...previous];
            next[index] = incomingMessage;
            return next;
          }
          return [...previous, incomingMessage];
        });

        if (incomingMessage.sender._id !== sessionUserId) {
          void markAsRead(conversationId);
        }
      }

      void refreshConversationList();
    },
    [markAsRead, refreshConversationList, selectedConversationId, sessionUserId, setMessages]
  );

  useAblyChannel(
    selectedConversationChannel,
    EVENTS.MESSAGE_UPDATED,
    (ablyMessage) => {
      const payload = isRecord(ablyMessage.data) ? ablyMessage.data : {};
      const updatedMessage = normalizeMessage(payload.message);
      if (!updatedMessage._id) return;

      setMessages((previous) =>
        previous.map((message) => (message._id === updatedMessage._id ? updatedMessage : message))
      );
      void refreshConversationList();
    },
    [refreshConversationList, setMessages]
  );

  useAblyChannel(
    selectedConversationChannel,
    EVENTS.MESSAGE_REACTED,
    (ablyMessage) => {
      const payload = isRecord(ablyMessage.data) ? ablyMessage.data : {};
      const updatedMessage = normalizeMessage(payload.message);
      if (!updatedMessage._id) return;

      setMessages((previous) =>
        previous.map((message) => (message._id === updatedMessage._id ? updatedMessage : message))
      );
    },
    [setMessages]
  );

  useAblyChannel(
    selectedConversationChannel,
    EVENTS.MESSAGES_READ,
    () => { void refreshConversationList(); },
    [refreshConversationList]
  );

  useAblyChannel(
    selectedConversationChannel,
    EVENTS.TYPING_STARTED,
    (ablyMessage) => {
      const payload = isRecord(ablyMessage.data) ? ablyMessage.data : {};
      const userId = toStringSafe(payload.userId);
      if (!userId || userId === sessionUserId) return;

      setTypingUserName(toStringSafe(payload.userName, 'Someone'));
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
      }
      typingIndicatorTimeoutRef.current = setTimeout(() => {
        setTypingUserName(null);
      }, 2500);
    },
    [sessionUserId, setTypingUserName]
  );

  useAblyChannel(
    selectedConversationChannel,
    EVENTS.TYPING_STOPPED,
    (ablyMessage) => {
      const payload = isRecord(ablyMessage.data) ? ablyMessage.data : {};
      const userId = toStringSafe(payload.userId);
      if (!userId || userId === sessionUserId) return;
      setTypingUserName(null);
    },
    [sessionUserId, setTypingUserName]
  );

  useAblyChannel(
    sessionUserId ? CHANNELS.userNotifications(sessionUserId) : null,
    EVENTS.MESSAGE_NOTIFICATION,
    () => { void refreshConversationList(); },
    [refreshConversationList, sessionUserId]
  );

  useAblyChannel(
    sessionUserId ? CHANNELS.userNotifications(sessionUserId) : null,
    EVENTS.CONVERSATION_CREATED,
    () => { void refreshConversationList(); },
    [refreshConversationList, sessionUserId]
  );

  useEffect(() => {
    if (!sessionUserId || !userParam || conversationParam) return;

    const startConversation = async (): Promise<void> => {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: userParam,
            content: 'Hello! I would like to discuss the job with you.',
            messageType: 'text',
          }),
        });
        const payload = (await response.json()) as Record<string, unknown>;
        if (!response.ok || payload.success !== true) return;

        const nextConversationId = toStringSafe(payload.conversationId);
        if (nextConversationId) {
          await setConversationParam(nextConversationId);
          await refreshConversationList();
        }
      } catch {
        // keep UI usable even if auto-bootstrap fails
      }
    };

    void startConversation();
  }, [conversationParam, refreshConversationList, sessionUserId, setConversationParam, userParam]);
}
