import { z } from 'zod';

import {
  badRequest,
  notFound,
  parseBody,
  requireSession,
  respond,
  serverError,
  unauthorized,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { MessageService } from '@/lib/services/messageService';
import Conversation from '@/models/Conversation';

import { asTrimmedString, isValidObjectId } from './shared';

type MarkReadBody = {
  conversationId?: unknown;
};

const MarkReadSchema = z.object({
  conversationId: z.unknown().optional(),
});

export async function PATCH(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = typeof session.user.id === 'string' ? session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, MarkReadSchema);
    if ('error' in parsed) return parsed.error;

    const body = parsed.data as MarkReadBody;
    const conversationId = asTrimmedString(body.conversationId);
    if (!conversationId) return badRequest('Conversation ID is required');
    if (!isValidObjectId(conversationId)) return badRequest('Invalid conversation ID');

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    }).select('_id');

    if (!conversation) return notFound('Conversation');

    await MessageService.markAsRead(conversationId, userId);

    return respond({ success: true, message: 'Messages marked as read' });
  } catch (error: unknown) {
    logger.error('Mark messages as read error:', error);
    return serverError('Failed to mark messages as read');
  }
}
