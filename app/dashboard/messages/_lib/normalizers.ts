import { isRecord, toBooleanSafe, toId, toNumberSafe, toStringSafe } from './primitives';
import type {
  Attachment,
  Conversation,
  ConversationJob,
  ConversationParticipant,
  ConversationPreviewMessage,
  Message,
  MessageThread,
  SelectedConversation,
  SessionUserInfo,
} from './types';

export { isRecord, toBooleanSafe, toId, toNumberSafe, toStringSafe } from './primitives';
export {
  extractPresenceUserId,
  formatAttachmentSize,
  formatCurrency,
  formatPresenceStatus,
  formatRelativeTime,
  formatTime,
  getMessagePreview,
  getReactionCount,
  getUserReaction,
  isAbortError,
} from './formatters';

export function getSessionUser(session: unknown): SessionUserInfo | null {
  if (!isRecord(session) || !isRecord(session.user)) return null;
  const user = session.user;
  const id = toStringSafe(user.id, '');
  if (!id) return null;
  return {
    id,
    name: toStringSafe(user.name, 'You'),
    username: toStringSafe(user.username, ''),
    image: toStringSafe(user.image, ''),
  };
}

export function normalizeParticipant(payload: unknown): ConversationParticipant {
  if (typeof payload === 'string') {
    return {
      _id: payload,
      name: 'User',
      username: '',
      photoURL: '',
      isOnline: false,
      lastSeen: undefined,
      ratingAverage: null,
    };
  }

  const source = isRecord(payload) ? payload : {};
  const rating = isRecord(source.rating) ? source.rating : {};
  const average = toNumberSafe(rating.average, Number.NaN);

  return {
    _id: toId(source._id),
    name: toStringSafe(source.name, 'Unknown user'),
    username: toStringSafe(source.username, ''),
    photoURL: toStringSafe(source.photoURL, ''),
    isOnline: toBooleanSafe(source.isOnline),
    lastSeen: toStringSafe(source.lastSeen, '') || undefined,
    ratingAverage: Number.isFinite(average) ? average : null,
  };
}

export function normalizeJob(payload: unknown): ConversationJob | null {
  if (!isRecord(payload)) return null;
  const budget = isRecord(payload.budget) ? payload.budget : {};
  const amount = toNumberSafe(budget.amount, Number.NaN);

  return {
    _id: toId(payload._id),
    title: toStringSafe(payload.title, 'Related job'),
    budgetAmount: Number.isFinite(amount) ? amount : null,
  };
}

export function normalizePreviewMessage(payload: unknown): ConversationPreviewMessage | null {
  if (!isRecord(payload)) return null;
  const sender = toStringSafe(payload.sender, 'them');
  return {
    content: toStringSafe(payload.content, ''),
    timestamp: toStringSafe(payload.timestamp, ''),
    sender: sender === 'me' ? 'me' : 'them',
    messageType: toStringSafe(payload.messageType, 'text'),
  };
}

export function normalizeConversation(payload: unknown): Conversation {
  const source = isRecord(payload) ? payload : {};
  return {
    _id: toId(source._id),
    participant: source.participant ? normalizeParticipant(source.participant) : null,
    relatedJob: normalizeJob(source.relatedJob),
    title: toStringSafe(source.title, ''),
    lastMessage: normalizePreviewMessage(source.lastMessage),
    unreadCount: toNumberSafe(source.unreadCount, 0),
  };
}

export function normalizeMessage(payload: unknown): Message {
  const source = isRecord(payload) ? payload : {};
  const attachmentsRaw = Array.isArray(source.attachments) ? source.attachments : [];
  const reactionsRaw = Array.isArray(source.reactions) ? source.reactions : [];
  const attachments: Attachment[] = [];
  const reactions: Message['reactions'] = [];
  const readByPayload = isRecord(source.readBy)
    ? Object.fromEntries(
        Object.entries(source.readBy)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [key, value as string])
      )
    : {};

  for (const attachment of attachmentsRaw) {
    const item = isRecord(attachment) ? attachment : {};
    const type = toStringSafe(item.type, '').toLowerCase();
    const url = toStringSafe(item.url, '');
    if (!url || !['image', 'document', 'link'].includes(type)) continue;
    attachments.push({
      type: type as Attachment['type'],
      url,
      filename: toStringSafe(item.filename, '') || undefined,
      size: typeof item.size === 'number' && Number.isFinite(item.size) ? item.size : undefined,
      mimeType: toStringSafe(item.mimeType, '') || undefined,
    });
  }

  for (const reaction of reactionsRaw) {
    const item = isRecord(reaction) ? reaction : {};
    const user = toId(item.user);
    const type = toStringSafe(item.type, '').toLowerCase();
    if (!user || !type) continue;
    reactions.push({
      user,
      type,
      reactedAt: toStringSafe(item.reactedAt, '') || undefined,
    });
  }

  return {
    _id: toId(source._id),
    sender: normalizeParticipant(source.sender),
    content: toBooleanSafe(source.deleted) ? 'Message deleted' : toStringSafe(source.content, ''),
    timestamp: toStringSafe(source.timestamp, ''),
    edited: toBooleanSafe(source.edited),
    deleted: toBooleanSafe(source.deleted),
    messageType: toStringSafe(source.messageType, 'text'),
    readBy: readByPayload,
    attachments,
    reactions,
    replyTo: toId(source.replyTo) || undefined,
  };
}

export function normalizeThread(payload: unknown): MessageThread {
  const source = isRecord(payload) ? payload : {};
  const participantsRaw = Array.isArray(source.participants) ? source.participants : [];
  const messagesRaw = Array.isArray(source.messages) ? source.messages : [];

  return {
    _id: toId(source._id),
    participants: participantsRaw
      .map(normalizeParticipant)
      .filter((participant) => participant._id.length > 0),
    relatedJob: normalizeJob(source.relatedJob),
    messages: messagesRaw.map(normalizeMessage),
  };
}

export function normalizeConversationFromApiData(payload: unknown): MessageThread {
  const source = isRecord(payload) ? payload : {};
  const conversation = isRecord(source.conversation) ? source.conversation : {};
  return normalizeThread({
    ...conversation,
    messages: Array.isArray(source.items) ? source.items : [],
  });
}

export function isConversationDetail(
  conversation: SelectedConversation | null
): conversation is MessageThread {
  return Boolean(conversation && 'participants' in conversation);
}

export function getOtherParticipant(
  conversation: SelectedConversation | null,
  sessionUserId: string
): ConversationParticipant | null {
  if (!conversation) return null;
  if (isConversationDetail(conversation)) {
    return (
      conversation.participants.find((participant) => participant._id !== sessionUserId) ?? null
    );
  }
  return conversation.participant;
}

export function getConversationParticipants(
  conversation: SelectedConversation | null
): ConversationParticipant[] {
  if (!conversation) return [];
  if (isConversationDetail(conversation)) return conversation.participants;
  return conversation.participant ? [conversation.participant] : [];
}
