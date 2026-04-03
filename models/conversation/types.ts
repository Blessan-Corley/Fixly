import mongoose from 'mongoose';

export type MessageType = 'text' | 'image' | 'file' | 'system';
export type ConversationType = 'direct' | 'job' | 'support';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AttachmentType = 'image' | 'document' | 'link';
export type MessageReactionType = 'thumbs_up' | 'heart' | 'laugh' | 'wow' | 'sad' | 'angry';

export type ParticipantRef =
  | mongoose.Types.ObjectId
  | string
  | {
      _id: mongoose.Types.ObjectId | string;
    };

export interface MessageAttachment {
  type?: AttachmentType;
  url?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface MessageReaction {
  user: ParticipantRef;
  type: MessageReactionType;
  reactedAt: Date;
}

export interface ConversationMessage {
  _id?: mongoose.Types.ObjectId | string;
  sender: ParticipantRef;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  readBy: Map<string, Date>;
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  replyTo?: mongoose.Types.ObjectId | string;
}

export interface ArchivedByEntry {
  user: ParticipantRef;
  archivedAt: Date;
}

export interface MutedByEntry {
  user: ParticipantRef;
  mutedUntil?: Date;
}

export interface ConversationMetadata {
  totalMessages: number;
  createdBy?: ParticipantRef;
  tags?: string[];
  priority: ConversationPriority;
}

export interface ConversationLastMessage {
  content: string;
  sender: ParticipantRef;
  messageType: MessageType;
  timestamp: Date;
}

export interface Conversation {
  participants: ParticipantRef[];
  messages: ConversationMessage[];
  relatedJob?: mongoose.Types.ObjectId | string;
  title?: string;
  conversationType: ConversationType;
  archived: boolean;
  archivedBy: ArchivedByEntry[];
  muted: boolean;
  mutedBy: MutedByEntry[];
  lastActivity: Date;
  lastMessage?: ConversationLastMessage;
  metadata: ConversationMetadata;
}

export type ConversationDocument = mongoose.HydratedDocument<Conversation, ConversationMethods>;

export interface ConversationMethods {
  addMessage(
    messageData: Pick<ConversationMessage, 'sender' | 'content'> & Partial<ConversationMessage>
  ): Promise<ConversationDocument>;
  markAsRead(userId: string): Promise<ConversationDocument>;
  getOtherParticipant(currentUserId: string): ParticipantRef | undefined;
  cleanupOldMessages(daysToKeep?: number): Promise<ConversationDocument>;
}

export interface ConversationModel extends mongoose.Model<Conversation, object, ConversationMethods> {
  findOrCreateBetween(
    user1Id: string,
    user2Id: string,
    jobId?: string | null
  ): Promise<ConversationDocument>;
}

export function toIdString(value: ParticipantRef | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  return value._id.toString();
}
