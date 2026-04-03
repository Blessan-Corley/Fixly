import { z } from 'zod';

export const CreateDisputeSchema = z.object({
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(2000),
  desiredOutcome: z.string().min(1).max(200),
  desiredOutcomeDetails: z.string().max(2000).optional(),
  amount: z.number().nonnegative().optional(),
  jobId: z.string().optional(),
  againstUserId: z.string().optional(),
  disputedAmount: z.number().nonnegative().optional(),
  refundRequested: z.number().nonnegative().optional(),
  additionalPaymentRequested: z.number().nonnegative().optional(),
});

export const UpdateDisputeStatusSchema = z.object({
  status: z.enum([
    'pending',
    'under_review',
    'awaiting_response',
    'in_mediation',
    'resolved',
    'escalated',
    'closed',
    'cancelled',
  ]),
  moderatorNotes: z.string().max(2000).optional(),
  resolution: z.string().max(2000).optional(),
  disputeId: z.string().optional(),
  assignedModerator: z.string().optional(),
});
