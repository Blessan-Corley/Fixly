import { appendTimelineEntry } from './state.helpers';
import type { ApiDisputeStatus, DisputeDocumentLike, RespondentResponseInput } from './state.types';

export function applyAdminDisputeStatusUpdate(
  dispute: DisputeDocumentLike,
  nextStatus: ApiDisputeStatus,
  performedBy: string,
  moderatorNotes?: string,
  assignedModerator?: string
): { previousStatus: ApiDisputeStatus; changed: boolean } {
  const previousStatus = dispute.status;
  dispute.status = nextStatus;

  if (typeof moderatorNotes === 'string') {
    dispute.moderatorNotes = moderatorNotes.trim();
  }

  if (assignedModerator) {
    dispute.assignedModerator = assignedModerator;
  }

  if (['resolved', 'closed', 'cancelled'].includes(nextStatus)) {
    dispute.isActive = false;
    dispute.closedAt = new Date();
    dispute.closedBy = performedBy;
    dispute.closureReason =
      nextStatus === 'resolved' ? 'Resolved by moderation' : `Status changed to ${nextStatus}`;
  } else {
    dispute.isActive = true;
    dispute.closedAt = undefined;
    dispute.closedBy = undefined;
    dispute.closureReason = undefined;
  }

  if (previousStatus !== nextStatus) {
    const statusActionMap: Record<ApiDisputeStatus, string | null> = {
      pending: null,
      under_review: 'admin_review_started',
      awaiting_response: 'resolution_proposed',
      in_mediation: 'mediation_started',
      resolved: 'dispute_resolved',
      escalated: 'dispute_escalated',
      closed: 'dispute_closed',
      cancelled: 'dispute_closed',
    };

    const action = statusActionMap[nextStatus];
    if (action) {
      appendTimelineEntry(
        dispute,
        action,
        performedBy,
        `Status changed from ${previousStatus} to ${nextStatus}`
      );
    }
  }

  return { previousStatus, changed: previousStatus !== nextStatus };
}

export function applyRespondentDisputeResponse(
  dispute: DisputeDocumentLike,
  performedBy: string,
  input: RespondentResponseInput
): { resolved: boolean } {
  dispute.response = {
    respondedBy: performedBy,
    content: input.content,
    counterEvidence: input.counterEvidence,
    respondedAt: new Date(),
    acknowledgement: input.acknowledgement,
    counterClaim: input.acknowledgement === 'counter_claim' ? input.counterClaim : undefined,
  };

  appendTimelineEntry(
    dispute,
    'response_submitted',
    performedBy,
    'Respondent submitted a dispute response'
  );

  if (input.acknowledgement === 'acknowledge') {
    dispute.status = 'resolved';
    dispute.isActive = false;
    dispute.closedAt = new Date();
    dispute.closedBy = performedBy;
    dispute.closureReason = 'Respondent acknowledged dispute';

    appendTimelineEntry(
      dispute,
      'resolution_accepted',
      performedBy,
      'Respondent acknowledged the dispute and accepted resolution'
    );
    appendTimelineEntry(dispute, 'dispute_resolved', performedBy, 'Dispute marked as resolved');

    return { resolved: true };
  }

  dispute.status = 'in_mediation';
  dispute.isActive = true;
  dispute.closedAt = undefined;
  dispute.closedBy = undefined;
  dispute.closureReason = undefined;

  appendTimelineEntry(
    dispute,
    'resolution_rejected',
    performedBy,
    input.acknowledgement === 'counter_claim'
      ? 'Respondent rejected claims and submitted a counter claim'
      : 'Respondent rejected claims and requested mediation'
  );
  appendTimelineEntry(dispute, 'mediation_started', performedBy, 'Dispute moved to mediation');

  return { resolved: false };
}
