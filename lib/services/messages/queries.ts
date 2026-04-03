import connectDB from '@/lib/db';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import type {
  CachedConversationPayload,
  ConversationMessage,
  ConversationListItem,
  PopulatedUser,
} from '@/lib/services/messages/message.types';
import {
  asArray,
  buildMessagePreview,
  hasReadReceipt,
  parseJson,
  toIdString,
} from '@/lib/services/messages/utils';
import Conversation from '@/models/Conversation';
import Job from '@/models/Job';

export async function getJobConversation(
  jobId: string,
  userId: string,
  createIfMissing = false
): Promise<CachedConversationPayload> {
  await connectDB();

  const job = (await Job.findById(jobId).select('createdBy assignedTo')) as {
    createdBy?: unknown;
    assignedTo?: unknown;
  } | null;

  if (!job) {
    throw new Error('Job not found');
  }

  const hirerId = toIdString(job.createdBy);
  const fixerId = toIdString(job.assignedTo);

  if (!hirerId || !fixerId) {
    throw new Error('Conversation not available for this job');
  }

  if (userId !== hirerId && userId !== fixerId) {
    throw new Error('Access denied');
  }

  let conversation = (await Conversation.findOne({
    relatedJob: jobId,
    participants: { $all: [hirerId, fixerId] },
  }).select('_id')) as { _id?: unknown } | null;

  if (!conversation && createIfMissing) {
    conversation = await Conversation.findOrCreateBetween(hirerId, fixerId, jobId);
  }

  const conversationId = toIdString(conversation?._id);
  if (!conversationId) {
    throw new Error('Conversation not found');
  }

  return getConversation(conversationId, userId);
}

export async function getConversation(
  conversationId: string,
  userId: string
): Promise<CachedConversationPayload> {
  try {
    const cacheKey = `conversation:${conversationId}:${userId}`;
    const cached = await redisUtils.get<string>(cacheKey);
    const cachedConversation = parseJson<CachedConversationPayload>(cached);

    if (cachedConversation) {
      return cachedConversation;
    }

    const conversation = (await Conversation.findById(conversationId)
      .populate([
        {
          path: 'participants',
          select: 'name username email photoURL role rating isOnline lastSeen',
        },
        {
          path: 'messages.sender',
          select: 'name username photoURL',
        },
        {
          path: 'relatedJob',
          select: 'title status budget location client fixer',
        },
      ])
      .lean()) as CachedConversationPayload | null;

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = asArray<unknown>(conversation.participants).some(
      (participant) => toIdString(participant) === userId
    );

    if (!isParticipant) {
      throw new Error('Access denied');
    }

    await redisUtils.setex(cacheKey, 300, JSON.stringify(conversation));

    return conversation;
  } catch (error: unknown) {
    logger.error('Error getting conversation:', error);
    throw error;
  }
}

export async function getUserConversations(userId: string, limit = 50): Promise<unknown[]> {
  try {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const cacheKey = `user_conversations:${userId}:${safeLimit}`;
    const cached = await redisUtils.get<string>(cacheKey);
    const cachedList = parseJson<unknown[]>(cached);

    if (cachedList) {
      return cachedList;
    }

    const conversations = (await Conversation.find({
      participants: userId,
    })
      .populate([
        {
          path: 'participants',
          select: 'name username email photoURL role rating isOnline lastSeen',
        },
        {
          path: 'relatedJob',
          select: 'title status budget',
        },
      ])
      .sort({ updatedAt: -1 })
      .limit(safeLimit)
      .lean()) as ConversationListItem[];

    const processedConversations = conversations.map((conversation) => {
      const participants = asArray<PopulatedUser>(conversation.participants);
      const otherParticipant =
        participants.find((participant) => toIdString(participant) !== userId) || null;

      const messages = asArray<ConversationMessage>(conversation.messages);
      const lastMessage = messages[messages.length - 1] || null;

      const unreadCount = messages.filter((message) => {
        const senderId = toIdString(message.sender);
        return senderId !== userId && !hasReadReceipt(message.readBy, userId);
      }).length;

      return {
        _id: conversation._id,
        participant: otherParticipant,
        relatedJob: conversation.relatedJob,
        title: conversation.title,
        lastMessage: lastMessage
          ? {
              content: buildMessagePreview(lastMessage),
              timestamp: lastMessage.timestamp,
              sender: toIdString(lastMessage.sender) === userId ? 'me' : 'them',
              messageType: lastMessage.messageType,
            }
          : null,
        unreadCount,
        updatedAt: conversation.updatedAt,
        conversationType: conversation.conversationType,
      };
    });

    await redisUtils.setex(cacheKey, 120, JSON.stringify(processedConversations));

    return processedConversations;
  } catch (error: unknown) {
    logger.error('Error getting user conversations:', error);
    throw error;
  }
}
