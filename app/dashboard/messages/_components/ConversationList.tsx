'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Search, Settings } from 'lucide-react';
import Image from 'next/image';

import SmartAvatar from '@/components/ui/SmartAvatar';

import { formatTime } from '../_lib/normalizers';
import type { Conversation } from '../_lib/types';

type ConversationListProps = {
  conversations: Conversation[];
  selectedId?: string;
  isLoading: boolean;
  hasMore: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (conversation: Conversation) => void;
  onLoadMore: () => void;
};

export function ConversationList({
  conversations,
  selectedId,
  isLoading,
  hasMore,
  searchQuery,
  onSearchChange,
  onSelect,
  onLoadMore,
}: ConversationListProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col border-r border-fixly-border">
      <div className="border-b border-fixly-border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-fixly-text">Messages</h2>
          <button type="button" className="rounded-lg p-2 hover:bg-fixly-bg">
            <Settings className="h-5 w-5 text-fixly-text-light" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fixly-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-fixly-border py-2 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fixly-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="p-8 text-center text-fixly-text-light">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
            <h3 className="mb-2 text-lg font-medium text-fixly-text">No conversations yet</h3>
            <p className="text-fixly-text-light">
              Start a conversation by applying to jobs or posting your own.
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation, index) => (
              <motion.button
                key={conversation._id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`w-full rounded-lg p-3 text-left transition-colors ${
                  selectedId === conversation._id ? 'bg-fixly-accent-light' : 'hover:bg-fixly-bg'
                }`}
                onClick={() => onSelect(conversation)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {conversation.participant?.photoURL ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-full">
                        <Image
                          src={conversation.participant.photoURL}
                          alt={`${conversation.participant.name} profile photo`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <SmartAvatar
                        user={{
                          name: conversation.participant?.name ?? 'Unknown User',
                          image: '',
                        }}
                        size="default"
                        className="h-12 w-12"
                      />
                    )}
                    {conversation.participant?.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-fixly-card bg-green-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="truncate font-semibold text-fixly-text">
                        {conversation.participant?.name ?? 'Unknown User'}
                      </h4>
                      <span className="text-xs text-fixly-text-light">
                        {conversation.lastMessage ? formatTime(conversation.lastMessage.timestamp) : ''}
                      </span>
                    </div>

                    <p className="truncate text-sm text-fixly-text-light">
                      {conversation.lastMessage
                        ? `${conversation.lastMessage.sender === 'me' ? 'You: ' : ''}${conversation.lastMessage.content}`
                        : 'No messages yet'}
                    </p>

                    <div className="mt-1 flex items-center justify-between">
                      {conversation.relatedJob ? (
                        <span className="rounded-full bg-fixly-accent-light px-2 py-1 text-xs text-fixly-accent">
                          Job Related
                        </span>
                      ) : (
                        <span />
                      )}
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-fixly-accent px-1 text-xs text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                className="w-full rounded-lg border border-fixly-border px-4 py-2 text-sm text-fixly-text-light hover:bg-fixly-bg"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
