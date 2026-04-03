import { after } from 'next/server';

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
import { requirePermission } from '@/lib/authorization';
import {
  applyAdminDisputeStatusUpdate,
  syncJobDisputeState,
  type ApiDisputeStatus,
} from '@/lib/disputes/state';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Dispute from '@/models/Dispute';
import { rateLimit } from '@/utils/rateLimiting';

import {
  ALLOWED_STATUSES,
  UpdateDisputeBodySchema,
  getStatusNotificationCopy,
  type SessionUser,
  type UpdateDisputeBody,
} from './shared';

export async function handlePutDispute(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'dispute_status_update', 60, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
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
      requirePermission(currentUser, 'moderate', 'dispute');
    } catch {
      return forbidden('Insufficient permissions');
    }

    const parsedBody = await parseBody(request, UpdateDisputeBodySchema);
    if ('error' in parsedBody) return parsedBody.error;
    const body: UpdateDisputeBody = parsedBody.data;

    const { disputeId, status, moderatorNotes, assignedModerator } = body;
    if (!disputeId || !status || !ALLOWED_STATUSES.has(status)) {
      return badRequest('Dispute ID and valid status are required');
    }

    if (typeof moderatorNotes === 'string' && moderatorNotes.trim()) {
      const moderation = await moderateUserGeneratedContent(moderatorNotes.trim(), {
        context: 'dispute',
        fieldLabel: 'Moderator notes',
        userId,
      });
      if (!moderation.allowed) {
        return badRequest(moderation.message ?? 'Content validation failed', {
          violations: moderation.violations,
          suggestions: moderation.suggestions,
        });
      }
    }

    await connectDB();

    const dispute = await Dispute.findOne({ disputeId });
    if (!dispute) return notFound('Dispute');

    const nextStatus = status as ApiDisputeStatus;
    const statusUpdate = applyAdminDisputeStatusUpdate(
      dispute,
      nextStatus,
      userId,
      moderatorNotes,
      assignedModerator
    );

    await dispute.save();
    await syncJobDisputeState({
      jobId: dispute.job,
      status: nextStatus,
      resolution: dispute.closureReason,
      resolvedBy: userId,
    });

    if (statusUpdate.changed) {
      const statusCopy = getStatusNotificationCopy(nextStatus);
      after(async () => {
        await inngest.send({
          name: 'notification/send.bulk',
          data: {
            notifications: [
              {
                userId: String(dispute.initiatedBy),
                type: 'dispute',
                title: statusCopy.title,
                message: statusCopy.message,
                link: `/dashboard/disputes/${disputeId}`,
                metadata: { disputeId, status: nextStatus },
              },
              {
                userId: String(dispute.againstUser),
                type: 'dispute',
                title: statusCopy.title,
                message: statusCopy.message,
                link: `/dashboard/disputes/${disputeId}`,
                metadata: { disputeId, status: nextStatus },
              },
            ],
          },
        });
      });
    }

    return respond({ success: true, message: 'Dispute status updated successfully' });
  } catch (error) {
    logger.error('Update dispute error:', error);
    return serverError('Failed to update dispute');
  }
}
