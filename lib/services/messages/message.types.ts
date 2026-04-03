export type MessageType = 'text' | 'image' | 'file' | 'system';

export type MessageReactionType = 'thumbs_up' | 'heart' | 'laugh' | 'wow' | 'sad' | 'angry';

export type MessageAttachment = {
  type: 'image' | 'document' | 'link';
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
};

export type MessageReaction = {
  user: unknown;
  type: MessageReactionType | string;
  reactedAt?: Date | string;
};

export type EntityWithId = {
  _id?: unknown;
  toString?: () => string;
};

export type PopulatedUser = {
  _id?: unknown;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  rating?: number;
  isOnline?: boolean;
  lastSeen?: Date | string;
};

export type JobDoc = {
  _id?: unknown;
  title?: string;
  urgency?: string;
  budget?: {
    amount?: number;
    materialsIncluded?: boolean;
  };
  deadline?: string | Date;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  description?: string;
  skillsRequired?: string[];
  client?: PopulatedUser;
};

export type ConversationMessage = {
  _id?: unknown;
  sender: unknown;
  content: string;
  messageType?: MessageType | string;
  timestamp?: Date | string;
  edited?: boolean;
  editedAt?: Date | string;
  deleted?: boolean;
  deletedAt?: Date | string;
  attachments?: unknown[];
  reactions?: unknown[];
  replyTo?: unknown;
  readBy?: Map<string, Date> | Record<string, unknown>;
};

export type ConversationDoc = {
  _id?: unknown;
  participants: unknown[];
  relatedJob?: unknown;
  title?: string;
  conversationType?: string;
  metadata: {
    totalMessages?: number;
    createdBy?: unknown;
    priority?: string;
  };
  lastActivity?: Date;
  messages: ConversationMessage[];
  updatedAt?: Date | string;
  save: () => Promise<unknown>;
};

export type CachedConversationPayload = ConversationDoc;

export type ConversationListItem = {
  _id?: unknown;
  participants?: Array<PopulatedUser & EntityWithId>;
  relatedJob?: unknown;
  title?: string;
  messages?: ConversationMessage[];
  updatedAt?: Date | string;
  conversationType?: string;
};

export type SendMessageResult = {
  success: true;
  message: ConversationMessage;
  conversationId: string;
};

export type SendMessageOptions = {
  attachments?: MessageAttachment[];
  replyTo?: string;
};

export type UpdateMessageResult = {
  success: true;
  message: ConversationMessage;
  conversationId: string;
};

export type ToggleReactionResult = {
  success: true;
  message: ConversationMessage;
  conversationId: string;
  reacted: boolean;
  reactionType: MessageReactionType | null;
};

export type CreateConversationResult = {
  success: true;
  conversationId: unknown;
  message: string;
};
