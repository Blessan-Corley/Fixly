import { z } from 'zod';

import type { WorkflowJob } from '@/models/job/workflow';
import type { IUser } from '@/types/User';

export type StatusBody = {
  newStatus?: string;
  reason?: string;
  assignedFixerId?: string;
  completionNotes?: string;
  disputeReason?: string;
  additionalData?: Record<string, unknown>;
};

export const statusBodySchema = z.object({
  newStatus: z.enum(['open', 'in_progress', 'completed', 'cancelled', 'disputed', 'expired']),
  reason: z.string().optional(),
  assignedFixerId: z.string().optional(),
  completionNotes: z.string().optional(),
  disputeReason: z.string().optional(),
  additionalData: z.record(z.string(), z.unknown()).optional(),
});

export type JobDoc = WorkflowJob & {
  _id: unknown;
  title: string;
  budget?: { amount?: number };
  updatedAt?: unknown;
  save(): Promise<unknown>;
};

export type UserDoc = IUser;

export type StatusTransitionContext = {
  job: JobDoc;
  currentUser: UserDoc;
  isAdmin: boolean;
  isJobCreator: boolean;
  reason: string | null;
  completionNotes: string | null;
  disputeReason: string | null;
  assignedFixerId: string | null;
  now: Date;
  userId: string;
  jobId: string;
};
