export interface SessionUserInfo {
  id: string;
  name: string;
  username: string;
  image: string;
}

export interface ConversationParticipant {
  _id: string;
  name: string;
  username: string;
  photoURL: string;
  isOnline: boolean;
  lastSeen?: string;
  ratingAverage: number | null;
}

export interface ConversationJob {
  _id: string;
  title: string;
  budgetAmount: number | null;
}

export interface ConversationPreviewMessage {
  content: string;
  timestamp: string;
  sender: 'me' | 'them';
  messageType: string;
}

export interface Conversation {
  _id: string;
  participant: ConversationParticipant | null;
  relatedJob: ConversationJob | null;
  title: string;
  lastMessage: ConversationPreviewMessage | null;
  unreadCount: number;
}

export interface Attachment {
  type: 'image' | 'document' | 'link';
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface PendingAttachment extends Attachment {
  uploadId: string;
  uploading: boolean;
}

export interface Reaction {
  user: string;
  type: string;
  reactedAt?: string;
}

export interface Message {
  _id: string;
  sender: ConversationParticipant;
  content: string;
  timestamp: string;
  edited: boolean;
  deleted: boolean;
  messageType: string;
  readBy: Record<string, string>;
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo?: string;
}

export interface MessageThread {
  _id: string;
  participants: ConversationParticipant[];
  relatedJob: ConversationJob | null;
  messages: Message[];
}

export interface PresenceUser {
  id: string;
  name?: string;
  image?: string;
  avatar?: string;
  lastSeen?: string;
  isCurrentUser?: boolean;
}

export interface ComposerState {
  text: string;
  attachments: PendingAttachment[];
  replyToMessageId: string | null;
  editingMessageId: string | null;
}

export type SelectedConversation = Conversation | MessageThread;

export type MessageReactionOption = {
  type: string;
  emoji: string;
};

export const MESSAGE_REACTIONS: MessageReactionOption[] = [
  { type: 'thumbs_up', emoji: '👍' },
  { type: 'heart', emoji: '❤️' },
  { type: 'laugh', emoji: '😂' },
  { type: 'wow', emoji: '😮' },
  { type: 'sad', emoji: '😢' },
  { type: 'angry', emoji: '😡' },
];
