export type LeanParticipant = {
  _id?: unknown;
  name?: string;
  username?: string;
  photoURL?: string;
  rating?: { average?: number };
  isOnline?: boolean;
  lastSeen?: string | Date;
};

export type LeanConversationMessage = {
  _id?: unknown;
  sender?: unknown;
  content?: string;
  timestamp?: string | Date;
  messageType?: string;
  readBy?: Map<string, Date> | Record<string, unknown>;
  attachments?: unknown[];
};

export type LeanConversation = {
  _id?: unknown;
  participants?: LeanParticipant[];
  relatedJob?: { _id?: unknown; title?: string; budget?: { amount?: number } } | null;
  title?: string;
  updatedAt?: string | Date;
  conversationType?: string;
  archived?: boolean;
  archivedBy?: Array<{ user?: unknown }>;
  messages?: LeanConversationMessage[];
};

export function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    if ('_id' in value) return toIdString((value as { _id?: unknown })._id);
    if ('toString' in value && typeof (value as { toString?: () => string }).toString === 'function') {
      const stringified = String(value);
      return stringified === '[object Object]' ? '' : stringified;
    }
  }
  return '';
}

export function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function hasReadReceipt(readBy: LeanConversationMessage['readBy'], userId: string): boolean {
  if (!readBy) return false;
  if (readBy instanceof Map) return readBy.has(userId);
  if (typeof readBy === 'object') return userId in (readBy as Record<string, unknown>);
  return false;
}

function buildMessagePreview(message: LeanConversationMessage | null) {
  if (!message) return null;
  const content = toTrimmedString(message.content);
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const preview =
    content ||
    (attachments.length === 1 ? 'Sent an attachment' : attachments.length > 1 ? `Sent ${attachments.length} attachments` : '');
  return {
    content: preview,
    timestamp: message.timestamp,
    sender: toIdString(message.sender) ? 'them' : ('them' as const),
    messageType: toTrimmedString(message.messageType) || 'text',
  };
}

export function normalizeConversation(conversation: LeanConversation, userId: string) {
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const otherParticipants = participants
    .filter((p) => toIdString(p?._id) !== userId)
    .map((p) => ({
      _id: toIdString(p?._id),
      name: toTrimmedString(p?.name) || 'Unknown user',
      username: toTrimmedString(p?.username),
      photoURL: toTrimmedString(p?.photoURL),
      isOnline: p?.isOnline === true,
      lastSeen: p?.lastSeen,
      ratingAverage: typeof p?.rating?.average === 'number' ? p.rating.average : null,
    }));

  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const lastMessage = messages[messages.length - 1] || null;
  const unreadCount = messages.filter((m) => {
    const senderId = toIdString(m.sender);
    return senderId && senderId !== userId && !hasReadReceipt(m.readBy, userId);
  }).length;

  return {
    _id: toIdString(conversation._id),
    participants: otherParticipants,
    participant: otherParticipants[0] || null,
    relatedJob: conversation.relatedJob
      ? {
          _id: toIdString(conversation.relatedJob._id),
          title: toTrimmedString(conversation.relatedJob.title) || 'Related job',
          budgetAmount: typeof conversation.relatedJob.budget?.amount === 'number' ? conversation.relatedJob.budget.amount : null,
        }
      : null,
    title: toTrimmedString(conversation.title),
    lastMessage: lastMessage
      ? { ...buildMessagePreview(lastMessage), sender: toIdString(lastMessage.sender) === userId ? 'me' : 'them' }
      : null,
    unreadCount,
    updatedAt: conversation.updatedAt,
    conversationType: conversation.conversationType || 'direct',
  };
}

export function parseCachedList(value: unknown): { items: unknown[]; total: number } | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as { items?: unknown; total?: unknown };
  if (!Array.isArray(payload.items) || typeof payload.total !== 'number') return null;
  return { items: payload.items, total: payload.total };
}
