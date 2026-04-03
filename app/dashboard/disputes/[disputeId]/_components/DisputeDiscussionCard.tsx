'use client';

import { Loader, MessageSquare, Send, Shield } from 'lucide-react';
import type { KeyboardEvent, MutableRefObject } from 'react';

import { formatDateTime } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.helpers';
import type { DisputeMessage } from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

type DisputeDiscussionCardProps = {
  messages: DisputeMessage[];
  currentUserId: string;
  newMessage: string;
  sendingMessage: boolean;
  canSendMessages: boolean;
  messagesEndRef: MutableRefObject<HTMLDivElement | null>;
  onMessageChange: (value: string) => void;
  onMessageKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
};

export function DisputeDiscussionCard({
  messages,
  currentUserId,
  newMessage,
  sendingMessage,
  canSendMessages,
  messagesEndRef,
  onMessageChange,
  onMessageKeyDown,
  onSend,
}: DisputeDiscussionCardProps): React.JSX.Element {
  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-semibold text-fixly-text">Discussion ({messages.length})</h2>

      <div className="mb-4 max-h-96 space-y-4 overflow-y-auto">
        {messages.length > 0 ? (
          messages.map((message, index) => {
            const isOwnMessage = message.sender._id === currentUserId;

            return (
              <div
                key={`${message.sender._id}-${message.timestamp}-${index}`}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
                    isOwnMessage ? 'bg-fixly-accent text-white' : 'bg-fixly-bg text-fixly-text'
                  }`}
                >
                  <div className="mb-1 flex items-center space-x-2">
                    <span className="text-xs font-medium">{message.sender.name}</span>
                    {message.senderType === 'admin' && <Shield className="h-3 w-3 text-red-400" />}
                    {message.senderType === 'moderator' && (
                      <Shield className="h-3 w-3 text-blue-400" />
                    )}
                  </div>
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isOwnMessage ? 'text-white/70' : 'text-fixly-text-light'
                    }`}
                  >
                    {formatDateTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-fixly-text-light" />
            <p className="text-fixly-text-light">No messages yet</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {canSendMessages && (
        <div className="border-t border-fixly-border pt-4">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyDown={onMessageKeyDown}
                placeholder="Type a message..."
                rows={2}
                className="w-full resize-none rounded-lg border border-fixly-border px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fixly-accent"
                maxLength={2000}
              />
            </div>
            <button
              onClick={onSend}
              disabled={!newMessage.trim() || sendingMessage}
              className="rounded-lg bg-fixly-accent p-2 text-white hover:bg-fixly-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingMessage ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
