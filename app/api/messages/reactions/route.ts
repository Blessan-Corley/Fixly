// Phase 2: Updated message reaction mutations to validate CSRF against the authenticated session.
import { Types } from 'mongoose';
import { z } from 'zod';

import {
  badRequest,
  forbidden,
  notFound,
  parseBody,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import { MessageService } from '@/lib/services/messageService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type MessageReactionType = 'thumbs_up' | 'heart' | 'laugh' | 'wow' | 'sad' | 'angry';

type ReactionRequestBody = {
  conversationId?: unknown;
  messageId?: unknown;
  reactionType?: unknown;
  emoji?: unknown;
};

const MessageReactionSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  reactionType: z.string().optional(),
  emoji: z.string().optional(),
});

const ALLOWED_REACTIONS: ReadonlySet<string> = new Set([
  'thumbs_up',
  'heart',
  'laugh',
  'wow',
  'sad',
  'angry',
]);

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

function isNotFoundError(error: unknown): boolean {
  const message = (error as Error)?.message?.toLowerCase() || '';
  return message.includes('not found');
}

function isAccessDeniedError(error: unknown): boolean {
  const message = (error as Error)?.message?.toLowerCase() || '';
  return message.includes('access denied') || message.includes('unauthorized');
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'message_reactions', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many reaction actions. Please slow down.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, MessageReactionSchema);
    if ('error' in parsed) return parsed.error;

    const body = parsed.data as ReactionRequestBody;

    const conversationId = asTrimmedString(body.conversationId);
    const messageId = asTrimmedString(body.messageId);
    const reactionType = asTrimmedString(body.reactionType || body.emoji).toLowerCase();

    if (!conversationId || !messageId || !reactionType) {
      return badRequest('Conversation ID, message ID, and reaction type are required');
    }

    if (!isValidObjectId(conversationId) || !isValidObjectId(messageId)) {
      return badRequest('Invalid conversation or message ID');
    }

    if (!ALLOWED_REACTIONS.has(reactionType)) {
      return badRequest('Invalid reaction type');
    }

    try {
      const result = await MessageService.toggleMessageReaction(
        conversationId,
        messageId,
        userId,
        reactionType as MessageReactionType
      );

      return respond({
        success: true,
        message: result.reacted ? 'Reaction updated' : 'Reaction removed',
        updatedMessage: result.message,
        reacted: result.reacted,
        reactionType: result.reactionType,
      });
    } catch (error: unknown) {
      if (isAccessDeniedError(error)) {
        return forbidden('Access denied');
      }

      if (isNotFoundError(error)) {
        return notFound('Message');
      }

      throw error;
    }
  } catch (error: unknown) {
    logger.error('Toggle message reaction error:', error);
    return serverError('Failed to update message reaction');
  }
}
