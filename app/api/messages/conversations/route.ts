import { NextRequest } from 'next/server';

import { apiPaginated, requireSession } from '@/lib/api';
import { handleRouteError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { withServiceFallback } from '@/lib/resilience/serviceGuard';
import Conversation from '@/models/Conversation';

export const dynamic = 'force-dynamic';

type LeanParticipant = {
  _id?: unknown;
  name?: string;
  username?: string;
  photoURL?: string;
  rating?: {
    average?: number;
  };
  isOnline?: boolean;
  lastSeen?: string | Date;
};

type LeanConversationMessage = {
  _id?: unknown;
  sender?: unknown;
  content?: string;
  timestamp?: string | Date;
  messageType?: string;
  readBy?: Map<string, Date> | Record<string, unknown>;
  attachments?: unknown[];
};

type LeanConversation = {
  _id?: unknown;
  participants?: LeanParticipant[];
  relatedJob?: {
    _id?: unknown;
    title?: string;
    budget?: {
      amount?: number;
    };
  } | null;
  title?: string;
  updatedAt?: string | Date;
  conversationType?: string;
  archived?: boolean;
  archivedBy?: Array<{ user?: unknown }>;
  messages?: LeanConversationMessage[];
};

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    if ('_id' in value) {
      return toIdString((value as { _id?: unknown })._id);
    }
    if ('toString' in value && typeof (value as { toString?: () => string }).toString === 'function') {
      const stringified = String(value);
      return stringified === '[object Object]' ? '' : stringified;
    }
  }
  return '';
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function hasReadReceipt(readBy: LeanConversationMessage['readBy'], userId: string): boolean {
  if (!readBy) return false;
  if (readBy instanceof Map) {
    return readBy.has(userId);
  }
  if (typeof readBy === 'object') {
    return userId in (readBy as Record<string, unknown>);
  }
  return false;
}

function buildMessagePreview(message: LeanConversationMessage | null): {
  content: string;
  timestamp: string | Date | undefined;
  sender: 'me' | 'them';
  messageType: string;
} | null {
  if (!message) return null;

  const content = toTrimmedString(message.content);
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const preview =
    content ||
    (attachments.length === 1 ? 'Sent an attachment' : attachments.length > 1 ? `Sent ${attachments.length} attachments` : '');

  return {
    content: preview,
    timestamp: message.timestamp,
    sender: toIdString(message.sender) ? 'them' : 'them',
    messageType: toTrimmedString(message.messageType) || 'text',
  };
}

function normalizeConversation(conversation: LeanConversation, userId: string) {
  const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
  const otherParticipants = participants
    .filter((participant) => toIdString(participant?._id) !== userId)
    .map((participant) => ({
      _id: toIdString(participant?._id),
      name: toTrimmedString(participant?.name) || 'Unknown user',
      username: toTrimmedString(participant?.username),
      photoURL: toTrimmedString(participant?.photoURL),
      isOnline: participant?.isOnline === true,
      lastSeen: participant?.lastSeen,
      ratingAverage:
        typeof participant?.rating?.average === 'number' ? participant.rating.average : null,
    }));

  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const lastMessage = messages[messages.length - 1] || null;
  const unreadCount = messages.filter((message) => {
    const senderId = toIdString(message.sender);
    return senderId && senderId !== userId && !hasReadReceipt(message.readBy, userId);
  }).length;

  return {
    _id: toIdString(conversation._id),
    participants: otherParticipants,
    participant: otherParticipants[0] || null,
    relatedJob: conversation.relatedJob
      ? {
          _id: toIdString(conversation.relatedJob._id),
          title: toTrimmedString(conversation.relatedJob.title) || 'Related job',
          budgetAmount:
            typeof conversation.relatedJob.budget?.amount === 'number'
              ? conversation.relatedJob.budget.amount
              : null,
        }
      : null,
    title: toTrimmedString(conversation.title),
    lastMessage: lastMessage
      ? {
          ...buildMessagePreview(lastMessage),
          sender: toIdString(lastMessage.sender) === userId ? 'me' : 'them',
        }
      : null,
    unreadCount,
    updatedAt: conversation.updatedAt,
    conversationType: conversation.conversationType || 'direct',
  };
}

function parseCachedList(value: unknown): { items: unknown[]; total: number } | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const payload = value as { items?: unknown; total?: unknown };
  if (!Array.isArray(payload.items) || typeof payload.total !== 'number') {
    return null;
  }
  return {
    items: payload.items,
    total: payload.total,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = toTrimmedString(auth.session.user.id);

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1, 1000);
    const limit = parsePositiveInt(searchParams.get('limit'), 20, 50);
    const status = toTrimmedString(searchParams.get('status')).toLowerCase();
    const normalizedStatus = status === 'archived' || status === 'active' ? status : 'active';
    const cacheKey = `messages:conversations:${userId}:${page}:${limit}:${normalizedStatus}`;

    const cached = parseCachedList(
      await withServiceFallback(
        () => redisUtils.get<{ items: unknown[]; total: number }>(cacheKey),
        null,
        'messages-conversations-cache-get'
      )
    );
    if (cached) {
      return apiPaginated(cached.items, cached.total, page, limit);
    }

    await connectDB();

    const archivedClause =
      normalizedStatus === 'archived'
        ? { archived: true, archivedBy: { $elemMatch: { user: userId } } }
        : {
            $or: [
              { archived: { $ne: true } },
              { archivedBy: { $not: { $elemMatch: { user: userId } } } },
            ],
          };

    const baseQuery = {
      participants: userId,
      ...archivedClause,
    };

    const [conversations, total] = await Promise.all([
      Conversation.find(baseQuery)
        .populate([
          {
            path: 'participants',
            select: 'name username photoURL rating isOnline lastSeen',
          },
          {
            path: 'relatedJob',
            select: 'title budget',
          },
        ])
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<LeanConversation[]>(),
      Conversation.countDocuments(baseQuery),
    ]);

    const items = conversations.map((conversation) => normalizeConversation(conversation, userId));

    await withServiceFallback(
      () => redisUtils.set(cacheKey, { items, total }, 30),
      false,
      'messages-conversations-cache-set'
    );

    return apiPaginated(items, total, page, limit);
  } catch (error: unknown) {
    logger.error({ error }, 'Get conversations route error');
    return handleRouteError(error);
  }
}
