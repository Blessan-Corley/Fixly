import { Types } from 'mongoose';
import { z } from 'zod';

export type SessionUser = {
  id?: string;
  role?: string;
};

export type SessionShape = {
  user?: SessionUser;
};

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export type JobUrgency = 'asap' | 'flexible' | 'scheduled';
export type SortBy = 'newest' | 'oldest' | 'deadline' | 'budget_high' | 'budget_low';
export type AdminJobAction = 'cancel' | 'feature' | 'unfeature' | 'resolve_dispute';

export type LeanJobRecord = {
  _id: Types.ObjectId | string;
  title?: string;
  createdAt?: Date | string;
  deadline?: Date | string | null;
  applications?: unknown[];
  createdBy?: unknown;
  assignedTo?: unknown;
  [key: string]: unknown;
};

export const AdminJobsActionSchema = z.object({
  action: z.enum(['cancel', 'feature', 'unfeature', 'resolve_dispute']),
  jobIds: z.array(z.string()).optional(),
  jobId: z.string().optional(),
  reason: z.string().optional(),
});
