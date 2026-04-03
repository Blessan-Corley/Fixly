import { z } from 'zod';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';

import { asTrimmedString } from './shared';

export type MessageType = 'text' | 'image' | 'file';

export type MessageAttachment = {
  type: 'image' | 'document' | 'link';
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
};

export type MessageRequestBody = {
  conversationId?: unknown;
  recipientId?: unknown;
  content?: unknown;
  messageType?: unknown;
  jobId?: unknown;
  attachments?: unknown;
  replyTo?: unknown;
};

export const ALLOWED_MESSAGE_TYPES: ReadonlySet<string> = new Set(['text', 'image', 'file']);

export const SendMessageBodySchema = z.object({
  conversationId: z.unknown().optional(),
  recipientId: z.unknown().optional(),
  content: z.unknown().optional(),
  messageType: z.unknown().optional(),
  jobId: z.unknown().optional(),
  attachments: z.unknown().optional(),
  replyTo: z.unknown().optional(),
});

export function toSafeMessageType(value: unknown): MessageType {
  const normalized = asTrimmedString(value).toLowerCase();
  return ALLOWED_MESSAGE_TYPES.has(normalized) ? (normalized as MessageType) : 'text';
}

export function normalizeAttachments(value: unknown): MessageAttachment[] {
  if (!Array.isArray(value)) return [];

  const normalized: MessageAttachment[] = [];
  for (const entry of value.slice(0, 5)) {
    const payload =
      typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
    const url = asTrimmedString(payload.url);
    const type = asTrimmedString(payload.type).toLowerCase();
    const filename = asTrimmedString(payload.filename);
    const mimeType = asTrimmedString(payload.mimeType);
    const size =
      typeof payload.size === 'number' && Number.isFinite(payload.size) ? payload.size : undefined;

    if (!url || !['image', 'document', 'link'].includes(type)) continue;

    normalized.push({
      type: type as MessageAttachment['type'],
      url,
      filename: filename || undefined,
      size,
      mimeType: mimeType || undefined,
    });
  }

  return normalized;
}

export function extractMessageMeta(
  result: unknown,
  fallbackConversationId: string
): { messageId: string; sentAt: string } {
  const messagePayload =
    result && typeof result === 'object' && 'message' in result
      ? ((result as Record<string, unknown>).message as Record<string, unknown>)
      : {};

  const sentAt =
    typeof messagePayload.timestamp === 'string'
      ? messagePayload.timestamp
      : new Date().toISOString();

  const messageId =
    typeof messagePayload._id === 'string'
      ? messagePayload._id
      : typeof messagePayload.id === 'string'
        ? messagePayload.id
        : `${fallbackConversationId}:${Date.now()}`;

  return { messageId, sentAt };
}

export async function publishSentMessage(params: {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | undefined;
  content: string;
  attachments: MessageAttachment[];
  sentAt: string;
  messageType: MessageType;
  recipientId: string;
}): Promise<void> {
  const {
    conversationId,
    messageId,
    senderId,
    senderName,
    senderAvatar,
    content,
    attachments,
    sentAt,
    messageType,
    recipientId,
  } = params;

  await publishToChannel(Channels.conversation(conversationId), Events.conversation.messageSent, {
    conversationId,
    messageId,
    senderId,
    senderName,
    senderAvatar,
    content: content || (attachments.length > 0 ? 'Sent an attachment' : ''),
    sentAt,
    type: messageType,
  });

  if (recipientId) {
    await publishToChannel(Channels.user(recipientId), Events.user.notificationSent, {
      notificationId: `message:${messageId}`,
      type: 'new_message',
      title: `Message from ${senderName}`,
      message: (content || 'Sent you an attachment').slice(0, 100),
      link: `/dashboard/messages?conversation=${conversationId}`,
      createdAt: sentAt,
    });
  }
}
