import type { ApiDisputeStatus, DisputeDocumentLike } from './state.types';

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

export function appendTimelineEntry(
  dispute: DisputeDocumentLike,
  action: string,
  performedBy: string,
  description: string
): void {
  dispute.timeline.push({
    action,
    performedBy,
    description,
    timestamp: new Date(),
  });
}

export function mapJobDisputeStatus(
  status: ApiDisputeStatus
): 'pending' | 'investigating' | 'resolved' | 'closed' {
  switch (status) {
    case 'resolved':
      return 'resolved';
    case 'closed':
    case 'cancelled':
      return 'closed';
    case 'under_review':
    case 'awaiting_response':
    case 'in_mediation':
    case 'escalated':
      return 'investigating';
    case 'pending':
    default:
      return 'pending';
  }
}
