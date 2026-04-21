'use client';

import { Edit3, Loader, MapPin, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Channels, Events } from '@/lib/ably/events';
import { useAblyPublish } from '@/lib/ably/hooks';

import { formatAttachmentSize, getMessagePreview } from '../_lib/normalizers';
import type { Message, PendingAttachment } from '../_lib/types';

import { EmojiPicker } from './EmojiPicker';

type ComposerProps = {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  onSend: (text: string, messageType?: string) => Promise<void>;
  onAttach: (files: FileList | File[]) => Promise<void>;
  onTyping: () => void;
  isLoading: boolean;
  isUploading: boolean;
  replyTo?: Message;
  editMessage?: Message;
  pendingAttachments: PendingAttachment[];
  onRemoveAttachment: (uploadId: string) => void;
  onCancelReply: () => void;
};

export function Composer({
  conversationId,
  currentUserId,
  currentUserName,
  onSend,
  onAttach,
  onTyping,
  isLoading,
  isUploading,
  replyTo,
  editMessage,
  pendingAttachments,
  onRemoveAttachment,
  onCancelReply,
}: ComposerProps): React.JSX.Element {
  const [text, setText] = useState('');
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const insertEmoji = (emoji: string): void => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    // Restore cursor position after the inserted emoji
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };
  const { publish } = useAblyPublish(
    conversationId ? Channels.conversation(conversationId) : ''
  );

  useEffect(() => {
    if (editMessage) {
      setText(editMessage.content);
      return;
    }

    if (!replyTo) {
      setText('');
    }
  }, [editMessage, replyTo]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const publishTypingStopped = async (): Promise<void> => {
    if (!conversationId || !currentUserId) {
      return;
    }

    await publish(Events.conversation.typingStopped, {
      conversationId,
      userId: currentUserId,
      userName: currentUserName,
    });
  };

  const publishTypingStarted = async (): Promise<void> => {
    if (!conversationId || !currentUserId) {
      return;
    }

    await publish(Events.conversation.typingStarted, {
      conversationId,
      userId: currentUserId,
      userName: currentUserName,
    });
  };

  const handleKeyPress = async (event: KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!text.trim() && pendingAttachments.length === 0) {
        return;
      }

      await onSend(text);
      await publishTypingStopped();
      setText('');
    }
  };

  const handleShareLocation = (): void => {
    if (!navigator.geolocation) return;
    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationPayload = JSON.stringify({ lat: latitude, lng: longitude });
        await onSend(locationPayload, 'location');
        setIsSharingLocation(false);
      },
      () => {
        setIsSharingLocation(false);
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  };

  return (
    <div className="border-t border-fixly-border bg-fixly-card p-4">
      {(replyTo || editMessage) && (
        <div className="mb-3 flex items-start justify-between rounded-lg border border-fixly-border bg-fixly-bg px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fixly-accent">
              {editMessage
                ? 'Editing message'
                : `Replying to ${
                    replyTo?.sender.name ? replyTo.sender.name : 'message'
                  }`}
            </p>
            <p className="mt-1 truncate text-sm text-fixly-text-light">
              {getMessagePreview(editMessage || replyTo)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setText('');
              onCancelReply();
            }}
            className="ml-3 rounded-full p-1 hover:bg-fixly-card"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.uploadId}
              className="flex items-center gap-2 rounded-full border border-fixly-border bg-fixly-bg px-3 py-1 text-sm text-fixly-text"
            >
              <span className="max-w-40 truncate">{attachment.filename || 'Attachment'}</span>
              <span className="text-xs text-fixly-text-light">
                {attachment.uploading ? 'Uploading...' : formatAttachmentSize(attachment.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.uploadId)}
                disabled={attachment.uploading}
                className="rounded-full p-1 hover:bg-fixly-card disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <label className="cursor-pointer rounded-lg p-2 text-fixly-text-light hover:bg-fixly-bg hover:text-fixly-accent">
          <Paperclip className="h-5 w-5" />
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            disabled={isUploading || Boolean(editMessage)}
            onChange={(event) => {
              const files = event.target.files;
              if (files && files.length > 0) {
                void onAttach(files);
                event.currentTarget.value = '';
              }
            }}
          />
        </label>

        <EmojiPicker onEmojiSelect={insertEmoji} />

        <button
          type="button"
          title="Share location"
          disabled={isSharingLocation || Boolean(editMessage)}
          onClick={handleShareLocation}
          className="rounded-lg p-2 text-fixly-text-light hover:bg-fixly-bg hover:text-fixly-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSharingLocation ? (
            <Loader className="h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </button>

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              onTyping();
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              void publishTypingStarted();
              typingTimeoutRef.current = setTimeout(() => {
                void publishTypingStopped();
              }, 1500);
            }}
            onKeyDown={(event) => {
              void handleKeyPress(event);
            }}
            onBlur={() => {
              void publishTypingStopped();
            }}
            placeholder={editMessage ? 'Edit your message...' : 'Type a message...'}
            rows={1}
            className="w-full resize-none rounded-lg border border-fixly-border bg-fixly-card px-4 py-2 text-fixly-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-fixly-accent"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        <button
          type="button"
          onClick={async () => {
            await onSend(text);
            await publishTypingStopped();
            setText('');
          }}
          disabled={(!text.trim() && pendingAttachments.length === 0) || isLoading || isUploading}
          className="rounded-lg bg-fixly-accent p-2 text-white hover:bg-fixly-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader className="h-5 w-5 animate-spin" />
          ) : editMessage ? (
            <Edit3 className="h-5 w-5" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
