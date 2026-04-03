import { z } from 'zod';

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
import { parseBody } from '@/lib/api/parse';
import { can, requirePermission } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Dispute from '@/models/Dispute';
import { rateLimit } from '@/utils/rateLimiting';

import { canAccessDispute, RouteContext, sendNotifications, SessionUser } from './shared';

type AddMessageBody = {
  content?: string;
  isPublic?: boolean;
};

const AddMessageBodySchema: z.ZodType<AddMessageBody> = z.object({
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function POST(request: Request, segmentData: RouteContext) {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'dispute_messages', 60, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many messages. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const currentUser: SessionUser = {
      id: userId,
      name: auth.session.user.name ?? undefined,
      role: typeof auth.session.user.role === 'string' ? auth.session.user.role : undefined,
    };
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;
    try {
      requirePermission(currentUser, 'update', 'dispute');
    } catch {
      return forbidden('Insufficient permissions');
    }

    const parsedBody = await parseBody(request, AddMessageBodySchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }
    const body: AddMessageBody = parsedBody.data;

    const content = (body.content || '').trim();
    if (!content) {
      return badRequest('Message content is required');
    }

    if (content.length > 2000) {
      return badRequest('Message too long (max 2000 characters)');
    }

    const messageModeration = await moderateUserGeneratedContent(content, {
      context: 'dispute',
      fieldLabel: 'Dispute message',
      userId: currentUser.id,
    });
    if (!messageModeration.allowed) {
      return badRequest(messageModeration.message ?? 'Content validation failed', {
        violations: messageModeration.violations,
        suggestions: messageModeration.suggestions,
      });
    }

    const { disputeId } = params;
    await connectDB();

    const dispute = await Dispute.findOne({ disputeId });
    if (!dispute) {
      return notFound('Dispute');
    }

    if (!canAccessDispute(dispute, currentUser)) {
      return forbidden('Access denied');
    }

    let senderType: 'client' | 'fixer' | 'admin' | 'moderator' = 'client';
    if (can(currentUser, 'moderate', 'dispute')) senderType = 'admin';
    else if (currentUser.role === 'fixer') senderType = 'fixer';

    const messageVisibility = can(currentUser, 'moderate', 'dispute')
      ? body.isPublic !== false
      : true;

    await dispute.addMessage(currentUser.id, senderType, content, messageVisibility);
    dispute.timeline.push({
      action: 'response_submitted',
      performedBy: currentUser.id,
      description: `${senderType} added a message`,
      timestamp: new Date(),
    });
    await dispute.save();

    const recipients = [String(dispute.initiatedBy), String(dispute.againstUser)];
    if (dispute.assignedModerator) {
      recipients.push(String(dispute.assignedModerator));
    }

    await sendNotifications(
      recipients
        .filter((id) => id !== currentUser.id)
        .map((recipientId) => ({
          userId: recipientId,
          title: 'New Dispute Message',
          message: `${currentUser.name || 'A user'} added a message to dispute ${disputeId}.`,
          data: { disputeId, actionUrl: `/dashboard/disputes/${disputeId}` },
        }))
    );

    return respond({
      success: true,
      message: 'Message added successfully',
    });
  } catch (error) {
    logger.error('Add dispute message error:', error);
    return serverError('Failed to add message');
  }
}
