import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import type { ConversationDoc, ConversationMessage } from '@/lib/services/messages/message.types';
import { broadcastMessagesRead } from '@/lib/services/messages/publisher';
import { asArray, ensureReadByMap, hasReadReceipt, toIdString } from '@/lib/services/messages/utils';
import Conversation from '@/models/Conversation';

export async function markAsRead(
  conversationId: string,
  userId: string
): Promise<{ success: true }> {
  try {
    const conversation = (await Conversation.findById(conversationId)) as ConversationDoc | null;
    if (!conversation) throw new Error('Conversation not found');

    let hasUnreadMessages = false;

    asArray<ConversationMessage>(conversation.messages).forEach((message) => {
      const senderId = toIdString(message.sender);
      const alreadyRead = hasReadReceipt(message.readBy, userId);

      if (senderId !== userId && !alreadyRead) {
        const readBy = ensureReadByMap(message);
        readBy.set(userId, new Date());
        hasUnreadMessages = true;
      }
    });

    if (hasUnreadMessages) {
      await conversation.save();
      await redisUtils.del(`conversation:${conversationId}:${userId}`);
      await redisUtils.invalidatePattern(`user_conversations:${userId}:*`);
      await broadcastMessagesRead(conversationId, userId);
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error marking messages as read:', error);
    throw error;
  }
}
