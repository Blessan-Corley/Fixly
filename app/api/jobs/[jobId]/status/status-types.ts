export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed' | 'expired';

export type TimelineEntry = {
  status: JobStatus;
  action: string;
  changedAt: Date;
  reason?: string;
  actor?: string;
};

export type AvailableStatusAction = {
  action: string;
  label: string;
  requiresData: string[];
};

export type StatusApplication = {
  _id?: unknown;
  fixer?: unknown;
  status?: string;
};

export type JobStatusEntity = {
  status: JobStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: unknown;
  assignedTo?: unknown;
  applications: StatusApplication[];
  progress?: {
    startedAt?: Date | string;
    arrivedAt?: Date | string;
    completedAt?: Date | string;
    markedDoneAt?: Date | string;
    [key: string]: unknown;
  };
  completion?: {
    markedDoneBy?: unknown;
    confirmedAt?: Date | string;
    confirmedBy?: unknown;
    completionNotes?: string;
    [key: string]: unknown;
  };
  cancellation?: {
    cancelledAt?: Date | string;
    reason?: unknown;
    cancelledBy?: unknown;
    [key: string]: unknown;
  };
  dispute?: {
    raised?: boolean;
    createdAt?: Date | string;
    reason?: unknown;
    raisedBy?: unknown;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const JOB_STATUSES: JobStatus[] = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
  'expired',
];

export { JOB_STATUSES };

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  open: ['in_progress', 'cancelled', 'expired'],
  in_progress: ['completed', 'cancelled', 'disputed'],
  completed: ['disputed'],
  cancelled: [],
  disputed: ['in_progress', 'completed', 'cancelled'],
  expired: ['open'],
};

export const STATUS_ROLE_PERMISSIONS: Record<JobStatus, Array<'hirer' | 'fixer'>> = {
  open: ['hirer'],
  in_progress: ['hirer', 'fixer'],
  completed: ['fixer'],
  cancelled: ['hirer'],
  disputed: ['hirer', 'fixer'],
  expired: ['hirer'],
};
