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
import { applyRespondentDisputeResponse, syncJobDisputeState } from '@/lib/disputes/state';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import Dispute from '@/models/Dispute';
import { rateLimit } from '@/utils/rateLimiting';

import { moderateDisputeContent } from '../../handlers/post-dispute.helpers';

import { normalizeCounterEvidence } from './put.helpers';
import { SubmitResponseBodySchema, type SubmitResponseBody } from './put.types';
import { RouteContext, sendNotifications, SessionUser } from './shared';

export async function PUT(request: Request, segmentData: RouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'dispute_response', 10, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many responses. Please try again later.');
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

    const parsedBody = await parseBody(request, SubmitResponseBodySchema);
    if ('error' in parsedBody) return parsedBody.error;
    const body: SubmitResponseBody = parsedBody.data;

    const content = (body.content ?? '').trim();
    const acknowledgement = body.acknowledgement;
    const counterEvidence = body.counterEvidence ?? [];

    if (!content) return badRequest('Response content is required');
    if (!acknowledgement || !['acknowledge', 'dispute', 'counter_claim'].includes(acknowledgement)) {
      return badRequest('Valid acknowledgement is required');
    }

    const responseFields = [
      { label: 'Dispute response', value: content },
      {
        label: 'Counter claim description',
        value: typeof body.counterClaim?.description === 'string' ? body.counterClaim.description.trim() : '',
      },
      {
        label: 'Counter claim desired outcome',
        value: typeof body.counterClaim?.desiredOutcome === 'string' ? body.counterClaim.desiredOutcome.trim() : '',
      },
    ];

    const moderationError = await moderateDisputeContent(responseFields, counterEvidence, currentUser.id);
    if (moderationError) return moderationError;

    const { disputeId } = params;
    await connectDB();

    const dispute = await Dispute.findOne({ disputeId });
    if (!dispute) return notFound('Dispute');

    if (String(dispute.againstUser) !== currentUser.id) {
      return forbidden('Only the respondent can submit a response');
    }

    if (dispute.response?.respondedBy) {
      return badRequest('Response already submitted');
    }

    const normalizedCounterEvidence = normalizeCounterEvidence(counterEvidence);

    const responseResult = applyRespondentDisputeResponse(dispute, currentUser.id, {
      content,
      counterEvidence: normalizedCounterEvidence,
      acknowledgement,
      counterClaim: acknowledgement === 'counter_claim' ? body.counterClaim : undefined,
    });

    await dispute.save();
    await syncJobDisputeState({
      jobId: dispute.job,
      status: dispute.status,
      resolution: dispute.closureReason,
      resolvedBy: currentUser.id,
    });

    const recipients = [String(dispute.initiatedBy)];
    if (dispute.assignedModerator) {
      recipients.push(String(dispute.assignedModerator));
    }

    await sendNotifications(
      recipients.map((recipientId) => ({
        userId: recipientId,
        title: responseResult.resolved ? 'Dispute Acknowledged' : 'Dispute Response Received',
        message: responseResult.resolved
          ? 'The other party acknowledged your dispute.'
          : 'The other party responded to your dispute.',
        data: { disputeId, acknowledgement, actionUrl: `/dashboard/disputes/${disputeId}` },
      }))
    );

    return respond({ success: true, message: 'Response submitted successfully' });
  } catch (error) {
    logger.error('Submit dispute response error:', error);
    return serverError('Failed to submit response');
  }
}
