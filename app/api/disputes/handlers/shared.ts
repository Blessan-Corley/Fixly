import { z } from 'zod';

export type SessionUser = {
  id: string;
  name?: string;
  role?: string;
};

export type UserContact = {
  email?: string;
  name?: string;
};

export type CreateDisputeBody = {
  jobId?: string;
  againstUserId?: string;
  category?: string;
  subcategory?: string;
  title?: string;
  description?: string;
  desiredOutcome?: string;
  desiredOutcomeDetails?: string;
  disputedAmount?: number;
  refundRequested?: number;
  additionalPaymentRequested?: number;
  evidence?: Array<{
    type: string;
    url: string;
    filename?: string;
    description?: string;
  }>;
};

export type UpdateDisputeBody = {
  disputeId?: string;
  status?: string;
  moderatorNotes?: string;
  assignedModerator?: string;
};

export const CreateDisputeBodySchema: z.ZodType<CreateDisputeBody> = z.object({
  jobId: z.string().optional(),
  againstUserId: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  desiredOutcome: z.string().optional(),
  desiredOutcomeDetails: z.string().optional(),
  disputedAmount: z.number().optional(),
  refundRequested: z.number().optional(),
  additionalPaymentRequested: z.number().optional(),
  evidence: z
    .array(
      z.object({
        type: z.string(),
        url: z.string(),
        filename: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const UpdateDisputeBodySchema: z.ZodType<UpdateDisputeBody> = z.object({
  disputeId: z.string().optional(),
  status: z.string().optional(),
  moderatorNotes: z.string().optional(),
  assignedModerator: z.string().optional(),
});

export const ALLOWED_STATUSES = new Set([
  'pending',
  'under_review',
  'awaiting_response',
  'in_mediation',
  'resolved',
  'escalated',
  'closed',
  'cancelled',
]);

export const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'status', 'priority', 'category']);

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function toIdString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

function hasSelectMethod(value: unknown): value is { select: (fields: string) => unknown } {
  return typeof value === 'object' && value !== null && 'select' in value;
}

function hasLeanMethod(value: unknown): value is { lean: () => Promise<UserContact | null> } {
  return typeof value === 'object' && value !== null && 'lean' in value;
}

export async function getUserContact(userId: string | null): Promise<UserContact | null> {
  if (!userId) return null;

  // Deferred import to avoid circular deps — User model loaded lazily
  const User = (await import('@/models/User')).default;
  const userLookup = User.findById(userId);
  const selectedLookup = hasSelectMethod(userLookup)
    ? userLookup.select('email name')
    : userLookup;
  const resolvedUser = hasLeanMethod(selectedLookup)
    ? await selectedLookup.lean()
    : await selectedLookup;

  return typeof resolvedUser === 'object' && resolvedUser !== null ? resolvedUser : null;
}

export function getStatusNotificationCopy(status: string): { title: string; message: string } {
  switch (status) {
    case 'under_review':
      return { title: 'Dispute Under Review', message: 'Your dispute is now being reviewed by our team.' };
    case 'awaiting_response':
      return { title: 'Response Required', message: 'A response from the other party is required to proceed.' };
    case 'in_mediation':
      return { title: 'Dispute In Mediation', message: 'Your dispute has moved into mediation.' };
    case 'resolved':
      return { title: 'Dispute Resolved', message: 'Your dispute has been resolved.' };
    case 'escalated':
      return { title: 'Dispute Escalated', message: 'Your dispute has been escalated for further review.' };
    case 'closed':
    case 'cancelled':
      return { title: 'Dispute Closed', message: 'This dispute has been closed.' };
    default:
      return { title: 'Dispute Updated', message: 'Your dispute status has been updated.' };
  }
}
