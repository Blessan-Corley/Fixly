import { logger } from '@/lib/logger';
import { invalidateConversationCaches } from '@/lib/services/messages/cache';
import type {
  ConversationDoc,
  ConversationMessage,
  MessageType,
  SendMessageOptions,
  SendMessageResult,
  UpdateMessageResult,
} from '@/lib/services/messages/message.types';
import { broadcastNewMessage, broadcastUpdatedMessage } from '@/lib/services/messages/publisher';
import { asArray, toIdString } from '@/lib/services/messages/utils';
import Conversation from '@/models/Conversation';

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: MessageType = 'text',
  options: SendMessageOptions = {}
): Promise<SendMessageResult> {
  try {
    const conversation = (await Conversation.findById(conversationId)) as ConversationDoc | null;
    if (!conversation) throw new Error('Conversation not found');

    const participants = asArray<unknown>(conversation.participants);
    if (!participants.some((p) => toIdString(p) === senderId)) {
      throw new Error('Access denied');
    }

    const trimmedContent = content.trim();
    const attachments = Array.isArray(options.attachments) ? options.attachments : [];
    if (!trimmedContent && attachments.length === 0) {
      throw new Error('Message content cannot be empty');
    }

    const newMessage: ConversationMessage = {
      sender: senderId,
      content: trimmedContent,
      messageType,
      timestamp: new Date(),
      readBy: new Map([[senderId, new Date()]]),
      attachments,
      replyTo: options.replyTo,
    };

    conversation.messages = asArray<ConversationMessage>(conversation.messages);
    conversation.messages.push(newMessage);
    conversation.lastActivity = new Date();
    conversation.metadata = conversation.metadata || {};
    conversation.metadata.totalMessages = conversation.messages.length;

    await conversation.save();

    const conversationIdSafe = toIdString(conversation._id) || conversationId;
    const participantIds = asArray<unknown>(conversation.participants).map(toIdString);
    await invalidateConversationCaches(participantIds, conversationIdSafe);

    const populatedConversation = (await Conversation.findById(conversationId)
      .populate('messages.sender', 'name username photoURL')
      .lean()) as { messages?: ConversationMessage[] } | null;

    const populatedMessages = asArray<ConversationMessage>(populatedConversation?.messages);
    const savedMessage = populatedMessages.pop() ?? newMessage;

    await broadcastNewMessage(conversation, savedMessage);

    return { success: true, message: savedMessage, conversationId };
  } catch (error: unknown) {
    logger.error('Error sending message:', error);
    throw error;
  }
}

export async function sendSystemMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<UpdateMessageResult> {
  return sendMessage(conversationId, senderId, content, 'system');
}

export async function updateMessage(
  conversationId: string,
  messageId: string,
  userId: string,
  action: 'edit' | 'delete',
  content = ''
): Promise<UpdateMessageResult> {
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
    if (!message || message.deleted) throw new Error('Message not found');
    if (toIdString(message.sender) !== userId) throw new Error('Access denied');

    if (action === 'edit') {
      const trimmedContent = content.trim();
      if (!trimmedContent) throw new Error('Message content is required');
      message.content = trimmedContent;
      message.edited = true;
      message.editedAt = new Date();
    } else {
      message.deleted = true;
      message.deletedAt = new Date();
      message.content = 'This message has been deleted';
    }

    conversation.lastActivity = new Date();
    await conversation.save();

    const conversationIdSafe = toIdString(conversation._id) || conversationId;
    const participantIds = asArray<unknown>(conversation.participants).map(toIdString);
    await invalidateConversationCaches(participantIds, conversationIdSafe);

    await broadcastUpdatedMessage(conversationIdSafe, action, messageId, message);

    return { success: true, message, conversationId: conversationIdSafe };
  } catch (error: unknown) {
    logger.error('Error updating message:', error);
    throw error;
  }
}
