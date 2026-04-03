export const VALID_STATUSES = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
  'expired',
] as const;

export const VALID_URGENCIES = ['asap', 'flexible', 'scheduled'] as const;
export const VALID_JOB_TYPES = ['one-time', 'recurring', 'contract', 'project'] as const;
export const VALID_BUDGET_TYPES = ['fixed', 'negotiable', 'hourly'] as const;
export const VALID_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'deadline',
  'scheduledDate',
  'status',
  'featured',
  'title',
]);

export type SessionUser = {
  id?: string;
  role?: string;
};

export type JobStatus = (typeof VALID_STATUSES)[number];
export type Urgency = (typeof VALID_URGENCIES)[number];
export type JobType = (typeof VALID_JOB_TYPES)[number];
export type BudgetType = (typeof VALID_BUDGET_TYPES)[number];

export type CreateJobBody = {
  title?: unknown;
  description?: unknown;
  skillsRequired?: unknown;
  budget?: unknown;
  location?: unknown;
  deadline?: unknown;
  urgency?: unknown;
  type?: unknown;
  attachments?: unknown;
  scheduledDate?: unknown;
  featured?: unknown;
  draftId?: unknown;
};

export type AttachmentInput = {
  id?: unknown;
  url?: unknown;
  publicId?: unknown;
  filename?: unknown;
  name?: unknown;
  type?: unknown;
  size?: unknown;
  isImage?: unknown;
  isVideo?: unknown;
  width?: unknown;
  height?: unknown;
  duration?: unknown;
  createdAt?: unknown;
};

export type NormalizedAttachment = {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  type: string;
  size: number;
  isImage: boolean;
  isVideo: boolean;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: Date;
};

export type LeanApplication = {
  status?: unknown;
};

export type LeanJob = {
  status?: unknown;
  deadline?: unknown;
  scheduledDate?: unknown;
  applications?: LeanApplication[];
  [key: string]: unknown;
};
