import { after } from 'next/server';

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
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { MessageService } from '@/lib/services/messageService';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  extractMessageMeta,
  normalizeAttachments,
  publishSentMessage,
  SendMessageBodySchema,
  toSafeMessageType,
  type MessageRequestBody,
} from './post.helpers';
import {
  asTrimmedString,
  isAccessDeniedError,
  isNotFoundError,
  isValidObjectId,
} from './shared';


export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'send_message', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many messages. Please slow down.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = typeof session.user.id === 'string' ? session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, SendMessageBodySchema);
    if ('error' in parsed) return parsed.error;

    const body = parsed.data as MessageRequestBody;
    const conversationId = asTrimmedString(body.conversationId);
    const recipientId = asTrimmedString(body.recipientId);
    const content = asTrimmedString(body.content);
    const attachments = normalizeAttachments(body.attachments);
    const messageType =
      attachments.length > 0
        ? attachments.every((a) => a.type === 'image')
          ? 'image'
          : 'file'
        : toSafeMessageType(body.messageType);
    const jobId = asTrimmedString(body.jobId);
    const replyTo = asTrimmedString(body.replyTo);

    if (!content && attachments.length === 0) {
      return badRequest('Message content or attachments are required');
    }
    if (content.length > 1000) return badRequest('Message too long (max 1000 characters)');
    if (!conversationId && !recipientId) {
      return badRequest('Either conversationId or recipientId is required');
    }
    if (replyTo && !isValidObjectId(replyTo)) return badRequest('Invalid reply target');

    if (content) {
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

    await connectDB();

    const senderName = session.user.name ?? 'User';
    const senderAvatar =
      typeof session.user.image === 'string' ? session.user.image : undefined;

    if (conversationId) {
      if (!isValidObjectId(conversationId)) return badRequest('Invalid conversation ID');

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).select('_id participants');

      if (!conversation) return notFound('Conversation');

      try {
        const result = await MessageService.sendMessage(
          conversationId,
          userId,
          content,
          messageType,
          { attachments, replyTo: replyTo || undefined }
        );

        const participantIds = Array.isArray(conversation.participants)
          ? conversation.participants
              .map((p) => String(p))
              .filter((pid) => pid && pid !== userId)
          : [];
        const firstRecipient = participantIds[0] ?? '';
        const { messageId, sentAt } = extractMessageMeta(result, conversationId);

        after(() =>
          publishSentMessage({
            conversationId,
            messageId,
            senderId: userId,
            senderName,
            senderAvatar,
            content,
            attachments,
            sentAt,
            messageType,
            recipientId: firstRecipient,
          })
        );

        return respond(result);
      } catch (error: unknown) {
        if (isAccessDeniedError(error)) return forbidden('Access denied');
        if (isNotFoundError(error)) return notFound('Conversation');
        throw error;
      }
    }

    if (!isValidObjectId(recipientId)) return badRequest('Invalid recipient ID');
    if (recipientId === userId) return badRequest('You cannot message yourself');

    const recipient = await User.findById(recipientId).select('_id');
    if (!recipient) return notFound('Recipient');

    if (jobId && !isValidObjectId(jobId)) return badRequest('Invalid job ID');

    const conversation = await Conversation.findOrCreateBetween(
      userId,
      recipientId,
      jobId || null
    );

    const result = await MessageService.sendMessage(
      String(conversation._id),
      userId,
      content,
      messageType,
      { attachments, replyTo: replyTo || undefined }
    );

    const nextConversationId = String(conversation._id);
    const { messageId, sentAt } = extractMessageMeta(result, nextConversationId);

    after(() =>
      publishSentMessage({
        conversationId: nextConversationId,
        messageId,
        senderId: userId,
        senderName,
        senderAvatar,
        content,
        attachments,
        sentAt,
        messageType,
        recipientId,
      })
    );

    return respond(result);
  } catch (error: unknown) {
    logger.error('Send message error:', error);
    return serverError('Failed to send message');
  }
}
