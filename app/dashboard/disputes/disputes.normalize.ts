import type {
  DisputeAmount,
  DisputeCategory,
  DisputeJob,
  DisputeMetadata,
  DisputeParty,
  DisputePriority,
  DisputeRecord,
  DisputeStatistics,
  DisputeStatus,
  PaginationState,
} from './disputes.types';
import { DEFAULT_PAGINATION, DEFAULT_STATISTICS } from './disputes.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function toStatus(value: unknown): DisputeStatus {
  const status = asString(value) as DisputeStatus;
  const allowed: DisputeStatus[] = [
    'pending',
    'under_review',
    'awaiting_response',
    'in_mediation',
    'resolved',
    'escalated',
    'closed',
    'cancelled',
  ];
  return allowed.includes(status) ? status : 'pending';
}

export function toPriority(value: unknown): DisputePriority {
  const priority = asString(value) as DisputePriority;
  const allowed: DisputePriority[] = ['low', 'medium', 'high', 'urgent'];
  return allowed.includes(priority) ? priority : 'medium';
}

export function toCategory(value: unknown): DisputeCategory {
  const category = asString(value) as DisputeCategory;
  const allowed: DisputeCategory[] = [
    'payment_issue',
    'work_quality',
    'communication_problem',
    'scope_disagreement',
    'timeline_issue',
    'unprofessional_behavior',
    'safety_concern',
    'other',
  ];
  return allowed.includes(category) ? category : 'other';
}

export function normalizeParty(value: unknown): DisputeParty {
  if (!isRecord(value)) {
    return { _id: '', name: 'Unknown User' };
  }

  return {
    _id: asString(value._id) || asString(value.id),
    name: asString(value.name) || 'Unknown User',
    photoURL: asString(value.photoURL) || undefined,
  };
}

export function normalizeAmount(value: unknown): DisputeAmount | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    disputedAmount: asNumber(value.disputedAmount) || undefined,
    refundRequested: asNumber(value.refundRequested) || undefined,
    additionalPaymentRequested: asNumber(value.additionalPaymentRequested) || undefined,
  };
}

export function normalizeMetadata(value: unknown): DisputeMetadata {
  if (!isRecord(value)) {
    return { totalMessages: 0 };
  }

  return {
    totalMessages: asNumber(value.totalMessages),
  };
}

export function normalizeJob(value: unknown): DisputeJob | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const title = asString(value.title);
  if (!title) {
    return undefined;
  }

  return { title };
}

export function normalizeDispute(value: unknown, index: number): DisputeRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const createdAt = asString(value.createdAt) || new Date().toISOString();
  const disputeId = asString(value.disputeId) || `DSP-${index + 1}`;

  return {
    _id: asString(value._id) || disputeId,
    disputeId,
    title: asString(value.title) || 'Untitled Dispute',
    status: toStatus(value.status),
    priority: toPriority(value.priority),
    category: toCategory(value.category),
    initiatedBy: normalizeParty(value.initiatedBy),
    againstUser: normalizeParty(value.againstUser),
    createdAt,
    amount: normalizeAmount(value.amount),
    job: normalizeJob(value.job),
    metadata: normalizeMetadata(value.metadata),
  };
}

export function normalizeStatistics(value: unknown): DisputeStatistics {
  if (!isRecord(value)) {
    return DEFAULT_STATISTICS;
  }

  return {
    total: asNumber(value.total),
    pending: asNumber(value.pending),
    underReview: asNumber(value.underReview),
    inMediation: asNumber(value.inMediation),
    resolved: asNumber(value.resolved),
  };
}

export function normalizePagination(value: unknown): PaginationState {
  if (!isRecord(value)) {
    return DEFAULT_PAGINATION;
  }

  return {
    currentPage: Math.max(1, asNumber(value.currentPage) || 1),
    totalPages: Math.max(1, asNumber(value.totalPages) || 1),
    hasMore: value.hasMore === true,
  };
}
