// Modular Conversation model — split into models/conversation/ sub-modules.
import mongoose from 'mongoose';

// Side-effect: attaches indexes, virtual, methods, statics, and hooks to ConversationSchema.
import './conversation/methods';
import { ConversationSchema } from './conversation/schema';
import type { Conversation, ConversationModel } from './conversation/types';

export type {
  Conversation,
  ConversationDocument,
  ConversationMethods,
  ConversationModel,
  ConversationMessage,
  ConversationLastMessage,
  ConversationMetadata,
  ConversationPriority,
  ConversationType,
  MessageType,
  ParticipantRef,
} from './conversation/types';

export { toIdString } from './conversation/types';

export default (mongoose.models.Conversation as ConversationModel) ||
  mongoose.model<Conversation, ConversationModel>('Conversation', ConversationSchema);
