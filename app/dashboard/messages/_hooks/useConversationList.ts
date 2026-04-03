'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useConversationsQuery } from '@/hooks/query/messages';

import { normalizeConversation } from '../_lib/normalizers';
import type { Conversation } from '../_lib/types';

type UseConversationListOptions = {
  enabled: boolean;
};

type UseConversationListResult = {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  isLoading: boolean;
  hasMore: boolean;
  totalUnread: number;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  refreshConversations: () => Promise<Conversation[]>;
  refetch: () => Promise<Conversation[]>;
  loadMore: () => Promise<void>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
};

export function useConversationList(
  options: UseConversationListOptions = { enabled: true }
): UseConversationListResult {
  const { enabled } = options;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const conversationsQuery = useConversationsQuery({
    enabled,
  });

  const normalizeFromQuery = useCallback((): Conversation[] => {
    const items = Array.isArray(conversationsQuery.data?.items)
      ? conversationsQuery.data.items
      : [];

    return items.map(normalizeConversation).filter((conversation) => conversation._id.length > 0);
  }, [conversationsQuery.data]);

  useEffect(() => {
    if (!conversationsQuery.data) {
      return;
    }

    setConversations(normalizeFromQuery());
  }, [conversationsQuery.data, normalizeFromQuery]);

  const refreshConversations = useCallback(async (): Promise<Conversation[]> => {
    const result = await conversationsQuery.refetch();
    const payload = Array.isArray(result.data?.items) ? result.data.items : [];
    const normalized = payload
      .map(normalizeConversation)
      .filter((conversation) => conversation._id.length > 0);
    setConversations(normalized);
    return normalized;
  }, [conversationsQuery]);

  const filteredConversations = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    if (!normalizedSearchQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      return (
        conversation.participant?.name.toLowerCase().includes(normalizedSearchQuery) ??
        false
      );
    });
  }, [conversations, searchQuery]);

  const totalUnread = useMemo(
    () => conversations.reduce((count, conversation) => count + conversation.unreadCount, 0),
    [conversations]
  );

  const loadMore = useCallback(async (): Promise<void> => {
    return Promise.resolve();
  }, []);

  return {
    conversations,
    filteredConversations,
    isLoading: conversationsQuery.isLoading,
    hasMore: false,
    totalUnread,
    searchQuery,
    setSearchQuery,
    refreshConversations,
    refetch: refreshConversations,
    loadMore,
    setConversations,
  };
}
