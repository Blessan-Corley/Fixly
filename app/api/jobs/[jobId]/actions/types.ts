import type { ObjectIdLike } from '@/models/job/workflow';

import type { JsonObject } from '../job-route-utils';

export type { ObjectIdLike };

export type JobApplicationLike = {
  _id?: ObjectIdLike;
  fixer?: ObjectIdLike;
  proposedAmount?: number;
  priceVariance?: number;
  priceVariancePercentage?: number;
  timeEstimate?: unknown;
  materialsList?: unknown;
  description?: string;
  requirements?: string;
  specialNotes?: string;
  negotiationNotes?: string;
  status?: string;
  appliedAt?: unknown;
};

export type JobDocumentLike = {
  _id?: ObjectIdLike;
  title?: string;
  status: string;
  createdBy: ObjectIdLike;
  assignedTo?: ObjectIdLike;
  budget?: { amount?: number; type?: string };
  progress: JsonObject & {
    startedAt?: Date;
    arrivedAt?: Date;
    completedAt?: Date;
    markedDoneAt?: Date;
    confirmedAt?: Date;
  };
  completion: JsonObject & {
    rating?: number;
    review?: string;
  };
  cancellation: JsonObject;
  dispute: JsonObject;
  applications: JobApplicationLike[] & {
    id: (id: string) => JobApplicationLike | null | undefined;
    forEach: (callback: (entry: JobApplicationLike) => void) => void;
  };
  save: () => Promise<unknown>;
};

export type ActionUserLike = {
  _id?: ObjectIdLike;
  name?: string;
  role?: string;
};

export type JobStatusEventAction =
  | 'accept_application'
  | 'reject_application'
  | 'cancel_job'
  | 'mark_completed'
  | 'mark_in_progress'
  | 'confirm_progress'
  | 'confirm_completion'
  | 'mark_arrived';
