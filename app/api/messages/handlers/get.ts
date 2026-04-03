import {
  badRequest,
  forbidden,
  notFound,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { MessageService } from '@/lib/services/messageService';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asTrimmedString,
  isAccessDeniedError,
  isConversationUnavailableError,
  isNotFoundError,
  isValidObjectId,
} from './shared';

type ConversationPayload = Awaited<ReturnType<typeof MessageService.getConversation>>;

function parsePositiveInt(
  value: string | null,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export async function GET(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'messages', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = typeof session.user.id === 'string' ? session.user.id : '';
    if (!userId) return unauthorized();

    await connectDB();

    const searchParams = new URL(request.url).searchParams;
    const conversationId = asTrimmedString(searchParams.get('conversationId'));
    const jobId = asTrimmedString(searchParams.get('jobId'));
    const page = parsePositiveInt(searchParams.get('page'), 1, 1, 1000);
    const limit = parsePositiveInt(searchParams.get('limit'), 20, 1, 100);

    if (conversationId) {
      if (!isValidObjectId(conversationId)) return badRequest('Invalid conversation ID');

      let conversation: ConversationPayload;
      try {
        conversation = await MessageService.getConversation(conversationId, userId);
      } catch (error: unknown) {
        if (isAccessDeniedError(error)) return forbidden('Access denied');
        if (isNotFoundError(error)) return notFound('Conversation');
        throw error;
      }

      const allMessages = Array.isArray(conversation?.messages) ? conversation.messages : [];
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = allMessages.slice().reverse().slice(startIndex, endIndex).reverse();

      if (page === 1) {
        try {
          await MessageService.markAsRead(conversationId, userId);
        } catch (readError: unknown) {
          logger.error('Failed to mark conversation as read:', readError);
        }
      }

      return respond({
        success: true,
        conversation: { ...conversation, messages: paginatedMessages },
        hasMore: endIndex < allMessages.length,
      });
    }

    if (jobId) {
      if (!isValidObjectId(jobId)) return badRequest('Invalid job ID');

      try {
        const conversation = await MessageService.getJobConversation(jobId, userId, true);
        const allMessages = Array.isArray(conversation?.messages) ? conversation.messages : [];
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMessages = allMessages
          .slice()
          .reverse()
          .slice(startIndex, endIndex)
          .reverse();

        if (page === 1) {
          try {
            await MessageService.markAsRead(String(conversation?._id ?? ''), userId);
          } catch (readError: unknown) {
            logger.error('Failed to mark job conversation as read:', readError);
          }
        }

        return respond({
          success: true,
          conversation: { ...conversation, messages: paginatedMessages },
          hasMore: endIndex < allMessages.length,
        });
      } catch (error: unknown) {
        if (isAccessDeniedError(error)) return forbidden('Access denied');
        if (isConversationUnavailableError(error))
          return forbidden('Conversation is not available for this job yet');
        if (isNotFoundError(error)) return notFound('Conversation');
        throw error;
      }
    }

    const conversations = await MessageService.getUserConversations(userId, limit);
    return respond({ success: true, conversations });
  } catch (error: unknown) {
    logger.error('Messages fetch error:', error);
    return serverError('Failed to fetch messages');
  }
}

