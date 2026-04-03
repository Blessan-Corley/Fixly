'use client';

import { motion } from 'framer-motion';
import { CheckCheck, Edit3, Paperclip, Reply, SmilePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';

import SmartAvatar from '@/components/ui/SmartAvatar';

import {
  formatAttachmentSize,
  formatTime,
  getMessagePreview,
  getReactionCount,
  getUserReaction,
} from '../_lib/normalizers';
import type { Message, MessageReactionOption } from '../_lib/types';

type MessageBubbleProps = {
  message: Message;
  currentUserId: string;
  selectedOtherParticipantId?: string;
  messages: Message[];
  reactionOptions: MessageReactionOption[];
  showAvatar: boolean;
  onReact: (messageId: string, reactionType: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReply: (messageId: string) => void;
};

export function MessageBubble({
  message,
  currentUserId,
  selectedOtherParticipantId,
  messages,
  reactionOptions,
  showAvatar,
  onReact,
  onEdit,
  onDelete,
  onReply,
}: MessageBubbleProps): React.JSX.Element {
  const isOwn = message.sender._id === currentUserId;
  const repliedMessage = message.replyTo
    ? messages.find((candidate) => candidate._id === message.replyTo)
    : undefined;
  const currentUserReaction = getUserReaction(message.reactions, currentUserId);
  const isReadByOtherParticipant =
    isOwn &&
    !!selectedOtherParticipantId &&
    typeof message.readBy[selectedOtherParticipantId] === 'string';

  return (
    <motion.div
      key={message._id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      {!isOwn && showAvatar ? (
        <SmartAvatar
          user={{ name: message.sender.name, image: message.sender.photoURL }}
          size="sm"
          className="h-8 w-8"
        />
      ) : !isOwn ? (
        <div className="w-8" />
      ) : null}

      <div
        className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
          isOwn
            ? 'bg-fixly-accent text-white'
            : 'border border-fixly-border bg-fixly-card text-fixly-text'
        }`}
      >
        {repliedMessage && (
          <div
            className={`mb-2 rounded-lg border-l-2 px-3 py-2 text-xs ${
              isOwn
                ? 'border-white/50 bg-white/10 text-white/80'
                : 'border-fixly-accent bg-fixly-bg text-fixly-text-light'
            }`}
          >
            <p className="font-medium">
              {repliedMessage.sender._id === currentUserId ? 'You' : repliedMessage.sender.name}
            </p>
            <p className="mt-1">{getMessagePreview(repliedMessage)}</p>
          </div>
        )}

        {message.attachments.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.attachments.map((attachment, attachmentIndex) => (
              <div
                key={`${message._id}-attachment-${attachmentIndex}`}
                className={`overflow-hidden rounded-lg border ${
                  isOwn ? 'border-white/20 bg-white/10' : 'border-fixly-border bg-fixly-bg'
                }`}
              >
                {attachment.type === 'image' ? (
                  <a href={attachment.url} target="_blank" rel="noreferrer">
                    <Image
                      src={attachment.url}
                      alt={attachment.filename || 'Attachment'}
                      width={1024}
                      height={640}
                      className="max-h-64 w-full object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{attachment.filename || 'Attachment'}</p>
                      <p
                        className={`text-xs ${isOwn ? 'text-white/70' : 'text-fixly-text-light'}`}
                      >
                        {formatAttachmentSize(attachment.size) || 'Open file'}
                      </p>
                    </div>
                    <Paperclip className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <p className={`text-sm ${message.deleted ? 'italic opacity-80' : ''}`}>
          {message.content}
        </p>

        {message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {reactionOptions.map((reaction) => {
              const reactionCount = getReactionCount(message.reactions, reaction.type);
              if (reactionCount === 0) return null;
              const isSelected = currentUserReaction === reaction.type;
              return (
                <button
                  key={`${message._id}-${reaction.type}`}
                  type="button"
                  onClick={() => onReact(message._id, reaction.type)}
                  className={`rounded-full border px-2 py-1 text-[11px] transition-colors ${
                    isSelected
                      ? isOwn
                        ? 'border-white/60 bg-white/20 text-white'
                        : 'border-fixly-accent bg-fixly-accent/10 text-fixly-accent'
                      : isOwn
                        ? 'border-white/30 bg-white/10 text-white/90'
                        : 'border-fixly-border bg-fixly-bg text-fixly-text-light'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="ml-1">{reactionCount}</span>
                </button>
              );
            })}
          </div>
        )}

        <div
          className={`mt-1 flex items-center justify-between text-xs ${
            isOwn ? 'text-white/70' : 'text-fixly-text-light'
          }`}
        >
          <span>{formatTime(message.timestamp)}</span>
          {isOwn && (
            <div className="flex items-center gap-1">
              {message.edited && <Edit3 className="h-3 w-3" />}
              <CheckCheck
                className={`h-3 w-3 ${isReadByOtherParticipant ? 'opacity-100' : 'opacity-60'}`}
              />
              <span>{isReadByOtherParticipant ? 'Seen' : 'Sent'}</span>
            </div>
          )}
        </div>

        {!message.deleted && (
          <div
            className={`mt-2 flex items-center gap-3 text-xs ${
              isOwn ? 'text-white/80' : 'text-fixly-text-light'
            }`}
          >
            <button
              type="button"
              onClick={() => onReply(message._id)}
              className="flex items-center gap-1 hover:underline"
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>
            <button
              type="button"
              onClick={() =>
                onReact(
                  message._id,
                  currentUserReaction === reactionOptions[0]?.type
                    ? reactionOptions[1]?.type || reactionOptions[0]?.type || 'heart'
                    : reactionOptions[0]?.type || 'thumbs_up'
                )
              }
              className="flex items-center gap-1 hover:underline"
            >
              <SmilePlus className="h-3 w-3" />
              {currentUserReaction ? 'Change reaction' : 'React'}
            </button>
            {isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(message)}
                  className="flex items-center gap-1 hover:underline"
                >
                  <Edit3 className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(message._id)}
                  className="flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
