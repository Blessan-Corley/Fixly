'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useAbly } from '@/contexts/AblyContext';
import { EVENTS } from '@/lib/ably';

import { extractPresenceUserId } from '../_lib/normalizers';

type UseMessagesPresenceParams = {
  selectedConversationChannel: string | null;
  selectedConversationId: string;
  selectedOtherParticipantId: string;
  sessionUserId: string;
  sessionUserName: string;
  setIsOtherParticipantActive: (value: boolean) => void;
  setTypingUserName: (value: string | null) => void;
};

type UseMessagesPresenceResult = {
  handleTyping: () => void;
};

export function useMessagesPresence({
  selectedConversationChannel,
  selectedConversationId,
  selectedOtherParticipantId,
  sessionUserId,
  sessionUserName,
  setIsOtherParticipantActive,
  setTypingUserName,
}: UseMessagesPresenceParams): UseMessagesPresenceResult {
  const { publishMessage, subscribeToPresence, enterPresence, leavePresence, getPresenceMembers } =
    useAbly();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncPresenceState = useCallback(async (): Promise<void> => {
    if (!selectedConversationChannel || !selectedOtherParticipantId) {
      setIsOtherParticipantActive(false);
      return;
    }
    try {
      const members = await getPresenceMembers(selectedConversationChannel);
      const isActive = members.some(
        (member) => extractPresenceUserId(member) === selectedOtherParticipantId
      );
      setIsOtherParticipantActive(isActive);
    } catch {
      setIsOtherParticipantActive(false);
    }
  }, [
    getPresenceMembers,
    selectedConversationChannel,
    selectedOtherParticipantId,
    setIsOtherParticipantActive,
  ]);

  const sendTypingEvent = useCallback(
    async (eventName: string): Promise<void> => {
      if (!selectedConversationChannel || !sessionUserId) return;
      await publishMessage(selectedConversationChannel, eventName, {
        conversationId: selectedConversationId,
        userId: sessionUserId,
        userName: sessionUserName || 'User',
      });
    },
    [publishMessage, selectedConversationChannel, selectedConversationId, sessionUserName, sessionUserId]
  );

  useEffect(() => {
    if (!selectedConversationChannel || !sessionUserId) {
      setIsOtherParticipantActive(false);
      return;
    }

    void enterPresence(selectedConversationChannel, {
      conversationId: selectedConversationId,
      status: 'active',
    });
    void syncPresenceState();

    return () => {
      void leavePresence(selectedConversationChannel);
      setIsOtherParticipantActive(false);
      setTypingUserName(null);
    };
  }, [
    enterPresence,
    leavePresence,
    selectedConversationChannel,
    selectedConversationId,
    sessionUserId,
    syncPresenceState,
    setIsOtherParticipantActive,
    setTypingUserName,
  ]);

  useEffect(() => {
    if (!selectedConversationChannel) return;

    let unsubscribe: (() => void) | undefined;
    const subscribe = async (): Promise<void> => {
      unsubscribe = await subscribeToPresence(selectedConversationChannel, () => {
        void syncPresenceState();
      });
    };

    void subscribe();
    return () => { unsubscribe?.(); };
  }, [selectedConversationChannel, subscribeToPresence, syncPresenceState]);

  const handleTyping = useCallback((): void => {
    if (!selectedConversationId) return;
    void sendTypingEvent(EVENTS.TYPING_STARTED);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      void sendTypingEvent(EVENTS.TYPING_STOPPED);
    }, 1500);
  }, [selectedConversationId, sendTypingEvent]);

  return { handleTyping };
}
