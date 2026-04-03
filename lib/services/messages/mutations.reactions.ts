import { logger } from '@/lib/logger';
import { invalidateConversationCaches } from '@/lib/services/messages/cache';
import type {
  ConversationDoc,
  ConversationMessage,
  MessageReaction,
  MessageReactionType,
  ToggleReactionResult,
} from '@/lib/services/messages/message.types';
import { broadcastReactionChange } from '@/lib/services/messages/publisher';
import { asArray, toIdString } from '@/lib/services/messages/utils';
import Conversation from '@/models/Conversation';

export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  userId: string,
  reactionType: MessageReactionType
): Promise<ToggleReactionResult> {
  try {
    const conversation = (await Conversation.findById(conversationId)) as ConversationDoc | null;
    if (!conversation) throw new Error('Conversation not found');

    const isParticipant = asArray<unknown>(conversation.participants).some(
      (p) => toIdString(p) === userId
    );
    if (!isParticipant) throw new Error('Access denied');

    const message = asArray<ConversationMessage>(conversation.messages).find(
      (entry) => toIdString(entry._id) === messageId
    );
    if (!message) throw new Error('Message not found');

    const reactions = Array.isArray(message.reactions)
      ? (message.reactions as MessageReaction[])
      : [];
    const existingIndex = reactions.findIndex((r) => toIdString(r.user) === userId);

    let reacted = false;
    let nextReactionType: MessageReactionType | null = reactionType;

    if (existingIndex >= 0) {
      const existing = reactions[existingIndex];
      if (existing.type === reactionType) {
        reactions.splice(existingIndex, 1);
        nextReactionType = null;
      } else {
        reactions[existingIndex] = { ...existing, type: reactionType, reactedAt: new Date() };
        reacted = true;
      }
    } else {
      reactions.push({ user: userId, type: reactionType, reactedAt: new Date() });
      reacted = true;
    }

    message.reactions = reactions;
    await conversation.save();

    const conversationIdSafe = toIdString(conversation._id) || conversationId;
    const participantIds = asArray<unknown>(conversation.participants).map(toIdString);
    await invalidateConversationCaches(participantIds, conversationIdSafe);

    await broadcastReactionChange(
      conversationIdSafe,
      messageId,
      reacted,
      nextReactionType,
      userId,
      message
    );

    return {
      success: true,
      message,
      conversationId: conversationIdSafe,
      reacted,
      reactionType: nextReactionType,
    };
  } catch (error: unknown) {
    logger.error('Error toggling message reaction:', error);
    throw error;
  }
}
