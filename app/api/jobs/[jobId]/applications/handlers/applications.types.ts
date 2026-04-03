import { z } from 'zod';

export type UpdateApplicationBody = {
  applicationId?: string;
  status?: 'accepted' | 'rejected';
  message?: string;
};

export const updateApplicationSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(['accepted', 'rejected']),
  message: z.string().optional(),
});

export type AuthorizedJob = {
  createdBy?: unknown;
};

export type JobWithApplications = {
  applications?: unknown[];
};

export type TxApplication = {
  _id?: unknown;
  fixer?: unknown;
  status?: string;
};

export type FixerContact = {
  email?: string;
  name?: string;
};
