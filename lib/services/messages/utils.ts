import type {
  ConversationMessage,
  EntityWithId,
  MessageAttachment,
} from '@/lib/services/messages/message.types';

export const parseJson = <T>(value: unknown): T | null => {
  if (typeof value === 'object' && value !== null) {
    return value as T;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const toIdString = (value: unknown): string => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const entity = value as EntityWithId;

    if (entity._id !== undefined) {
      return toIdString(entity._id);
    }

    if (typeof entity.toString === 'function') {
      const asString = entity.toString();
      return asString === '[object Object]' ? '' : asString;
    }
  }

  return '';
};

const getMapValue = (readBy: ConversationMessage['readBy'], userId: string): unknown => {
  if (!readBy) {
    return undefined;
  }

  if (readBy instanceof Map) {
    return readBy.get(userId);
  }

  if (typeof readBy === 'object') {
    return (readBy as Record<string, unknown>)[userId];
  }

  return undefined;
};

export const hasReadReceipt = (
  readBy: ConversationMessage['readBy'],
  userId: string
): boolean => {
  return Boolean(getMapValue(readBy, userId));
};

export const ensureReadByMap = (message: ConversationMessage): Map<string, Date> => {
  if (message.readBy instanceof Map) {
    return message.readBy;
  }

  const map = new Map<string, Date>();

  if (message.readBy && typeof message.readBy === 'object') {
    Object.entries(message.readBy).forEach(([key, value]) => {
      const date = value instanceof Date ? value : new Date(String(value));
      if (!Number.isNaN(date.getTime())) {
        map.set(key, date);
      }
    });
  }

  message.readBy = map;
  return map;
};

export const asArray = <T>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : [];
};

export const formatRupee = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Negotiable';
  }

  return `INR ${value.toLocaleString('en-IN')}`;
};

export const normalizeConversationMessage = (
  message: ConversationMessage
): Record<string, unknown> => ({
  _id: message._id,
  content: message.content,
  sender: message.sender,
  timestamp: message.timestamp,
  messageType: message.messageType,
  edited: Boolean(message.edited),
  editedAt: message.editedAt,
  deleted: Boolean(message.deleted),
  deletedAt: message.deletedAt,
  attachments: Array.isArray(message.attachments) ? message.attachments : [],
  reactions: Array.isArray(message.reactions) ? message.reactions : [],
  replyTo: message.replyTo,
  readBy:
    message.readBy instanceof Map ? Object.fromEntries(message.readBy.entries()) : message.readBy,
});

export const buildMessagePreview = (message: ConversationMessage): string => {
  const content = message.content.trim();
  if (content) {
    return content.length > 80 ? `${content.slice(0, 80)}...` : content;
  }

  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  if (attachments.length === 1) {
    const firstAttachment = attachments[0] as MessageAttachment;
    return firstAttachment.type === 'image' ? 'Sent an image' : 'Sent an attachment';
  }

  if (attachments.length > 1) {
    return `Sent ${attachments.length} attachments`;
  }

  return 'New message';
};
