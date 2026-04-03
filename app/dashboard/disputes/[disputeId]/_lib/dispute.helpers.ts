import type {
  DisputeCounterClaim,
  DisputeDetail,
  DisputeEvidence,
  DisputeJobSummary,
  DisputeMessage,
  DisputeParty,
  DisputeResponse,
  DisputeStatus,
  DisputeTimelineEntry,
  ResponseAcknowledgement,
} from '@/app/dashboard/disputes/[disputeId]/_lib/dispute.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function toNumberSafe(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function toOptionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = toNumberSafe(value);
  return parsed > 0 ? parsed : null;
}

export function toId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (isRecord(value) && typeof value._id === 'string') return value._id;
  return '';
}

export function toStatus(value: unknown): DisputeStatus {
  switch (value) {
    case 'pending':
    case 'under_review':
    case 'awaiting_response':
    case 'in_mediation':
    case 'resolved':
    case 'escalated':
    case 'closed':
    case 'cancelled':
      return value;
    default:
      return 'pending';
  }
}

export function toSenderType(value: unknown): DisputeMessage['senderType'] {
  switch (value) {
    case 'client':
    case 'fixer':
    case 'admin':
    case 'moderator':
      return value;
    default:
      return 'client';
  }
}

export function toAcknowledgement(value: unknown): ResponseAcknowledgement {
  switch (value) {
    case 'acknowledge':
    case 'dispute':
    case 'counter_claim':
      return value;
    default:
      return 'dispute';
  }
}

export function normalizeParty(payload: unknown): DisputeParty {
  const source = isRecord(payload) ? payload : {};
  return {
    _id: toId(source._id),
    name: toStringSafe(source.name, 'Unknown'),
    username: toStringSafe(source.username, ''),
    photoURL: toStringSafe(source.photoURL, ''),
    role: toStringSafe(source.role, 'user'),
  };
}

export function normalizeEvidence(payload: unknown): DisputeEvidence {
  const source = isRecord(payload) ? payload : {};
  const type = toStringSafe(source.type, 'document');
  return {
    type:
      type === 'image' || type === 'document' || type === 'screenshot' || type === 'chat_log'
        ? type
        : 'document',
    url: toStringSafe(source.url, ''),
    filename: toStringSafe(source.filename, 'Attachment'),
    description: toStringSafe(source.description, ''),
  };
}

export function normalizeMessage(payload: unknown): DisputeMessage {
  const source = isRecord(payload) ? payload : {};
  return {
    sender: normalizeParty(source.sender),
    senderType: toSenderType(source.senderType),
    content: toStringSafe(source.content, ''),
    timestamp: toStringSafe(source.timestamp, ''),
  };
}

export function normalizeCounterClaim(payload: unknown): DisputeCounterClaim {
  const source = isRecord(payload) ? payload : {};
  return {
    category: toStringSafe(source.category, ''),
    description: toStringSafe(source.description, ''),
    desiredOutcome: toStringSafe(source.desiredOutcome, ''),
    amount: toOptionalNumber(source.amount),
  };
}

export function normalizeResponse(payload: unknown): DisputeResponse | null {
  if (!isRecord(payload)) return null;
  const respondedBy = toId(payload.respondedBy);
  if (!respondedBy) return null;

  return {
    respondedBy,
    content: toStringSafe(payload.content, ''),
    respondedAt: toStringSafe(payload.respondedAt, ''),
    acknowledgement: toAcknowledgement(payload.acknowledgement),
    counterClaim: payload.counterClaim ? normalizeCounterClaim(payload.counterClaim) : null,
  };
}

export function normalizeTimelineEntry(payload: unknown): DisputeTimelineEntry {
  const source = isRecord(payload) ? payload : {};
  return {
    action: toStringSafe(source.action, 'updated'),
    description: toStringSafe(source.description, ''),
    timestamp: toStringSafe(source.timestamp, ''),
  };
}

export function normalizeJob(payload: unknown): DisputeJobSummary | null {
  if (!isRecord(payload)) return null;
  const budget = isRecord(payload.budget) ? payload.budget : {};
  return {
    _id: toId(payload._id),
    title: toStringSafe(payload.title, 'Untitled job'),
    category: toStringSafe(payload.category, ''),
    status: toStringSafe(payload.status, ''),
    budgetAmount: toOptionalNumber(budget.amount),
  };
}

export function normalizeDispute(payload: unknown): DisputeDetail | null {
  if (!isRecord(payload)) return null;

  const evidenceRaw = Array.isArray(payload.evidence) ? payload.evidence : [];
  const messagesRaw = Array.isArray(payload.messages) ? payload.messages : [];
  const timelineRaw = Array.isArray(payload.timeline) ? payload.timeline : [];
  const amountSource = isRecord(payload.amount) ? payload.amount : {};

  return {
    disputeId: toStringSafe(payload.disputeId, ''),
    title: toStringSafe(payload.title, 'Untitled dispute'),
    description: toStringSafe(payload.description, ''),
    category: toStringSafe(payload.category, ''),
    subcategory: toStringSafe(payload.subcategory, ''),
    desiredOutcome: toStringSafe(payload.desiredOutcome, ''),
    desiredOutcomeDetails: toStringSafe(payload.desiredOutcomeDetails, ''),
    status: toStatus(payload.status),
    createdAt: toStringSafe(payload.createdAt, ''),
    initiatedBy: normalizeParty(payload.initiatedBy),
    againstUser: normalizeParty(payload.againstUser),
    assignedModerator: payload.assignedModerator ? normalizeParty(payload.assignedModerator) : null,
    amount: {
      disputedAmount: toNumberSafe(amountSource.disputedAmount),
      refundRequested: toNumberSafe(amountSource.refundRequested),
      additionalPaymentRequested: toNumberSafe(amountSource.additionalPaymentRequested),
    },
    evidence: evidenceRaw.map(normalizeEvidence),
    response: normalizeResponse(payload.response),
    messages: messagesRaw.map(normalizeMessage),
    timeline: timelineRaw.map(normalizeTimelineEntry),
    job: normalizeJob(payload.job),
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function getSessionUserId(session: unknown): string {
  if (!isRecord(session) || !isRecord(session.user)) return '';
  return toStringSafe(session.user.id, '');
}

export function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(value: number | null): string {
  if (value == null || value <= 0) {
    return 'Not specified';
  }
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function buildResponsePayload(responseData: {
  content: string;
  acknowledgement: ResponseAcknowledgement;
  counterClaim: {
    category: string;
    description: string;
    desiredOutcome: string;
    amount: string;
  };
}) {
  const parsedCounterAmount = Number.parseFloat(responseData.counterClaim.amount);
  const counterAmount =
    Number.isFinite(parsedCounterAmount) && parsedCounterAmount > 0
      ? parsedCounterAmount
      : undefined;

  return {
    content: responseData.content.trim(),
    acknowledgement: responseData.acknowledgement,
    counterClaim:
      responseData.acknowledgement === 'counter_claim'
        ? {
            category: responseData.counterClaim.category.trim(),
            description: responseData.counterClaim.description.trim(),
            desiredOutcome: responseData.counterClaim.desiredOutcome.trim(),
            amount: counterAmount,
          }
        : undefined,
  };
}
