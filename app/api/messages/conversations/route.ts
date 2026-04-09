import { NextRequest } from 'next/server';

import { apiPaginated, requireSession } from '@/lib/api';
import { handleRouteError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { withServiceFallback } from '@/lib/resilience/serviceGuard';
import Conversation from '@/models/Conversation';

import {
  normalizeConversation,
  parseCachedList,
  parsePositiveInt,
  toTrimmedString,
  type LeanConversation,
} from './helpers';

export const dynamic = 'force-dynamic';

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
    if (cached) return apiPaginated(cached.items, cached.total, page, limit);

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

    const baseQuery = { participants: userId, ...archivedClause };

    const [conversations, total] = await Promise.all([
      Conversation.find(baseQuery)
        .populate([
          { path: 'participants', select: 'name username photoURL rating isOnline lastSeen' },
          { path: 'relatedJob', select: 'title budget' },
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
