'use client';

import { useSession } from 'next-auth/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CHANNELS } from '@/lib/ably';

import { formatPresenceStatus, getSessionUser } from '../_lib/normalizers';
import {
  MESSAGE_REACTIONS,
  type Conversation,
  type Message,
  type PresenceUser,
} from '../_lib/types';

import { useConversationList } from './useConversationList';
import { useMessagesAttachments } from './useMessagesAttachments';
import { useMessagesPresence } from './useMessagesPresence';
import { useMessagesRealtime } from './useMessagesRealtime';
import { useMessageThread } from './useMessageThread';

export function useMessagesController() {
  const { data: session } = useSession();
  const sessionUser = getSessionUser(session);
  const sessionUserId = sessionUser?.id ?? '';

  const [conversationParam, setConversationParam] = useQueryState('conversation', parseAsString);
  const [userParam] = useQueryState('user', parseAsString);
  const [jobParam] = useQueryState('job', parseAsString);

  const [showInfo, setShowInfo] = useState(false);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const [isOtherParticipantActive, setIsOtherParticipantActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationsList, setShowConversationsList] = useState(true);

  const conversationList = useConversationList({ enabled: Boolean(sessionUserId) });
  const thread = useMessageThread({
    conversationId: conversationParam ?? undefined,
    jobId: !conversationParam ? jobParam ?? undefined : undefined,
    sessionUser,
    enabled: Boolean(sessionUserId),
  });

  const selectedConversation =
    conversationList.conversations.find((c) => c._id === conversationParam) ?? null;
  const selectedThread = thread.thread;
  const selectedConversationId = selectedThread?._id || conversationParam || '';
  const selectedConversationChannel = selectedConversationId
    ? CHANNELS.conversation(selectedConversationId)
    : null;
  const selectedParticipants = selectedThread?.participants ?? [];
  const selectedOtherParticipant =
    selectedParticipants.find((p) => p._id !== sessionUserId) ??
    selectedConversation?.participant ??
    null;
  const selectedOtherParticipantId = selectedOtherParticipant?._id || '';

  const messageMap = useMemo(
    () => new Map(thread.messages.map((m) => [m._id, m])),
    [thread.messages]
  );
  const replyingToMessage = replyingToMessageId ? messageMap.get(replyingToMessageId) : undefined;
  const editingMessage = editingMessageId ? messageMap.get(editingMessageId) : undefined;

  useEffect(() => {
    const checkMobile = (): void => {
      const nextIsMobile = window.innerWidth < 768;
      setIsMobile(nextIsMobile);
      if (nextIsMobile && selectedConversationId) {
        setShowConversationsList(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void thread.markAsRead(selectedConversationId);
  }, [selectedConversationId, thread]);

  const refreshConversationList = useCallback(async (): Promise<void> => {
    await conversationList.refreshConversations();
  }, [conversationList]);

  const { handleTyping } = useMessagesPresence({
    selectedConversationChannel,
    selectedConversationId,
    selectedOtherParticipantId,
    sessionUserId,
    sessionUserName: sessionUser?.name ?? '',
    setIsOtherParticipantActive,
    setTypingUserName,
  });

  useMessagesRealtime({
    selectedConversationChannel,
    selectedConversationId,
    sessionUserId,
    userParam,
    conversationParam,
    setConversationParam,
    setMessages: thread.setMessages,
    markAsRead: thread.markAsRead,
    refreshConversationList,
    setTypingUserName,
  });

  const { pendingAttachments, uploadAttachments, removePendingAttachment, clearAttachments } =
    useMessagesAttachments();

  const handleSelectConversation = async (conversation: Conversation): Promise<void> => {
    setReplyingToMessageId(null);
    setEditingMessageId(null);
    clearAttachments();
    await setConversationParam(conversation._id);
    if (isMobile) setShowConversationsList(false);
  };

  const handleSend = async (text: string): Promise<void> => {
    if (!selectedConversationId) return;
    const readyAttachments = pendingAttachments.filter((a) => !a.uploading && a.url);

    if (editingMessageId) {
      await thread.updateMessage(editingMessageId, 'edit', text);
    } else {
      await thread.sendMessage({
        conversationId: selectedConversationId,
        content: text,
        attachments: readyAttachments,
        replyTo: replyingToMessageId || undefined,
      });
    }

    setReplyingToMessageId(null);
    setEditingMessageId(null);
    clearAttachments();
    void refreshConversationList();
  };

  const handleReply = (messageId: string): void => {
    setEditingMessageId(null);
    setReplyingToMessageId(messageId);
  };

  const handleEdit = (message: Message): void => {
    setReplyingToMessageId(null);
    setEditingMessageId(message._id);
  };

  const handleDelete = async (messageId: string): Promise<void> => {
    await thread.updateMessage(messageId, 'delete');
    void refreshConversationList();
  };

  const handleReact = async (messageId: string, reactionType: string): Promise<void> => {
    await thread.toggleReaction(messageId, reactionType);
  };

  const participantStatusText = typingUserName
    ? `${typingUserName} is typing...`
    : isOtherParticipantActive || selectedOtherParticipant?.isOnline
      ? 'Active now'
      : formatPresenceStatus(selectedOtherParticipant?.lastSeen);

  const presenceUsers: PresenceUser[] = selectedParticipants
    .filter((p) => p._id === sessionUserId || p._id === selectedOtherParticipantId)
    .map((p) => ({
      id: p._id,
      name: p.name,
      avatar: p.photoURL,
      lastSeen: p.lastSeen,
    }));

  return {
    sessionUser,
    conversationList,
    thread,
    selectedConversation,
    selectedThread,
    selectedOtherParticipant,
    selectedOtherParticipantId,
    selectedParticipants,
    selectedConversationId,
    participantStatusText,
    presenceUsers,
    showInfo,
    setShowInfo,
    replyingToMessage,
    editingMessage,
    pendingAttachments,
    handleTyping,
    handleSelectConversation,
    uploadAttachments,
    removePendingAttachment,
    handleSend,
    handleReply,
    handleEdit,
    handleDelete,
    handleReact,
    cancelReply: () => {
      setReplyingToMessageId(null);
      setEditingMessageId(null);
    },
    isMobile,
    showConversationsList,
    setShowConversationsList,
    reactionOptions: MESSAGE_REACTIONS,
  };
}
