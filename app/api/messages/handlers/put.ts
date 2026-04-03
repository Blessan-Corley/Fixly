import { z } from 'zod';

import {
  badRequest,
  forbidden,
  notFound,
  parseBody,
  requireSession,
  respond,
  serverError,
  unauthorized,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import { MessageService } from '@/lib/services/messageService';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';

import { asTrimmedString, isAccessDeniedError, isNotFoundError, isValidObjectId } from './shared';

type MessageUpdateBody = {
  conversationId?: unknown;
  messageId?: unknown;
  content?: unknown;
  action?: unknown;
};

const MessageUpdateSchema = z.object({
  conversationId: z.unknown().optional(),
  messageId: z.unknown().optional(),
  content: z.unknown().optional(),
  action: z.unknown().optional(),
});

export async function PUT(request: Request) {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = typeof session.user.id === 'string' ? session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, MessageUpdateSchema);
    if ('error' in parsed) return parsed.error;

    const body = parsed.data as MessageUpdateBody;
    const conversationId = asTrimmedString(body.conversationId);
    const messageId = asTrimmedString(body.messageId);
    const content = asTrimmedString(body.content);
    const action = asTrimmedString(body.action).toLowerCase();

    if (!conversationId || !messageId) {
      return badRequest('Conversation ID and Message ID are required');
    }
    if (!isValidObjectId(conversationId) || !isValidObjectId(messageId)) {
      return badRequest('Invalid conversation or message ID');
    }
    if (action !== 'edit' && action !== 'delete') {
      return badRequest('Invalid action. Use "edit" or "delete".');
    }

    if (action === 'edit') {
      if (!content) return badRequest('Message content is required');
      if (content.length > 1000) return badRequest('Message too long (max 1000 characters)');

      const moderationResult = await moderateUserGeneratedContent(content, {
        context: 'private_message',
        fieldLabel: 'Message',
        userId,
      });
      if (!moderationResult.allowed) {
        return badRequest(moderationResult.message ?? 'Message failed moderation', {
          violations: moderationResult.violations,
          suggestions: moderationResult.suggestions,
        });
      }
    }

    try {
      const result = await MessageService.updateMessage(
        conversationId,
        messageId,
        userId,
        action as 'edit' | 'delete',
        content
      );
      return respond({
        success: true,
        message: 'Message updated successfully',
        updatedMessage: result.message,
      });
    } catch (error: unknown) {
      if (isAccessDeniedError(error)) return forbidden('You can only edit your own messages');
      if (isNotFoundError(error)) return notFound('Message');
      throw error;
    }
  } catch (error: unknown) {
    logger.error('Update message error:', error);
    return serverError('Failed to update message');
  }
}
