// Phase 2: Moved message realtime publishing onto the typed Ably channel and event catalogue.
import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { logger } from '@/lib/logger';
import type {
  ConversationDoc,
  ConversationMessage,
  JobDoc,
  PopulatedUser,
} from '@/lib/services/messages/message.types';
import { sendPrivateMessageNotification } from '@/lib/services/messages/notifications';
import {
  asArray,
  buildMessagePreview,
  normalizeConversationMessage,
  toIdString,
} from '@/lib/services/messages/utils';

export async function broadcastConversationCreated(
  conversation: ConversationDoc,
  job: JobDoc,
  fixer: PopulatedUser
): Promise<void> {
  try {
    const participantIds = asArray<unknown>(conversation.participants)
      .map(toIdString)
      .filter(Boolean);
    const clientId = toIdString(job.client);

    for (const participantId of participantIds) {
      const otherParticipant =
        participantId === clientId
          ? { name: fixer.name, username: fixer.username }
          : { name: job.client?.name, username: job.client?.username };

      await publishToChannel(Channels.user(participantId), Events.user.conversationCreated, {
        conversationId: conversation._id,
        type: 'job_assignment',
        title: `Job Assigned: ${job.title || 'Untitled job'}`,
        message: 'You can now communicate privately about this job',
        jobId: job._id,
        jobTitle: job.title,
        otherParticipant,
        timestamp: new Date().toISOString(),
        actionUrl: `/dashboard/messages?conversation=${toIdString(conversation._id)}`,
      });
    }

    logger.info(
      `[MessageService] Conversation creation broadcasted for job ${toIdString(job._id)}`
    );
  } catch (error: unknown) {
    logger.error('Error broadcasting conversation creation:', error);
  }
}

export async function broadcastNewMessage(
  conversation: ConversationDoc,
  message: ConversationMessage
): Promise<void> {
  try {
    const conversationId = toIdString(conversation._id);
    await publishToChannel(Channels.conversation(conversationId), Events.conversation.messageSent, {
      conversationId,
      message: normalizeConversationMessage(message),
      totalMessages: conversation.metadata?.totalMessages || asArray(conversation.messages).length,
    });

    const senderId = toIdString(message.sender);
    const otherParticipantIds = asArray<unknown>(conversation.participants)
      .map(toIdString)
      .filter((id) => id && id !== senderId);

    const senderName =
      typeof message.sender === 'object' && message.sender
        ? (message.sender as PopulatedUser).name || 'Someone'
        : 'Someone';

    for (const participantId of otherParticipantIds) {
      const messagePreview = buildMessagePreview(message);

      await publishToChannel(Channels.user(participantId), Events.user.messageNotification, {
        conversationId,
        senderName,
        content: messagePreview,
        timestamp: message.timestamp,
        actionUrl: `/dashboard/messages?conversation=${conversationId}`,
      });

      await sendPrivateMessageNotification({
        participantId,
        conversationId,
        relatedJobId: toIdString(conversation.relatedJob),
        senderId,
        senderName,
        messagePreview,
      });
    }

    logger.info(`[MessageService] Message broadcasted for conversation ${conversationId}`);
  } catch (error: unknown) {
    logger.error('Error broadcasting message:', error);
  }
}

export async function broadcastUpdatedMessage(
  conversationId: string,
  action: 'edit' | 'delete',
  messageId: string,
  message: ConversationMessage
): Promise<void> {
  await publishToChannel(Channels.conversation(conversationId), Events.conversation.messageUpdated, {
    conversationId,
    action,
    messageId,
    message: normalizeConversationMessage(message),
    timestamp: new Date().toISOString(),
  });
}

export async function broadcastReactionChange(
  conversationId: string,
  messageId: string,
  reacted: boolean,
  reactionType: string | null,
  userId: string,
  message: ConversationMessage
): Promise<void> {
  await publishToChannel(Channels.conversation(conversationId), Events.conversation.messageReacted, {
    conversationId,
    messageId,
    reacted,
    reactionType,
    userId,
    message: normalizeConversationMessage(message),
    timestamp: new Date().toISOString(),
  });
}

export async function broadcastMessagesRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await publishToChannel(Channels.conversation(conversationId), Events.conversation.messagesRead, {
    conversationId,
    readBy: userId,
    timestamp: new Date().toISOString(),
  });
}
