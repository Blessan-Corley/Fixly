import { Types } from 'mongoose';
import { z } from 'zod';

export const FIXER_APPS_CACHE_TTL = 120; // 2 minutes

export const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type SessionUser = {
  id?: string;
  role?: string;
};

export type JobApplication = {
  _id?: Types.ObjectId | string;
  fixer?: Types.ObjectId | string;
  proposedAmount?: number;
  timeEstimate?: unknown;
  coverLetter?: string;
  status?: string;
  appliedAt?: Date | string;
  materialsList?: unknown[];
};

export type JobRecord = {
  _id: Types.ObjectId | string;
  title?: string;
  description?: string;
  budget?: unknown;
  location?: unknown;
  status?: string;
  createdAt?: Date | string;
  deadline?: Date | string;
  skillsRequired?: unknown;
  createdBy?: unknown;
  assignedTo?: unknown;
  applications?: JobApplication[];
};

export const FixerApplicationsQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function toObjectIdString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (value && typeof value === 'object' && '_id' in value) {
    return toObjectIdString((value as { _id?: unknown })._id);
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const stringified = String(value);
    return stringified === '[object Object]' ? '' : stringified;
  }
  return '';
}

export function toApplicationStatus(value: string | null): ApplicationStatus | null | 'invalid' {
  if (!value) return null;
  return APPLICATION_STATUSES.includes(value as ApplicationStatus)
    ? (value as ApplicationStatus)
    : 'invalid';
}

export function extractApplicationEntry(
  job: JobRecord,
  userId: string,
  status: ApplicationStatus | null
) {
  const jobApplications = Array.isArray(job.applications) ? job.applications : [];
  const application = jobApplications.find(
    (item) => toObjectIdString(item.fixer) === userId && (!status || item.status === status)
  );
  if (!application) return null;

  return {
    _id: application._id,
    job: {
      _id: job._id,
      title: job.title,
      description: job.description,
      budget: job.budget,
      location: job.location,
      status: job.status,
      createdAt: job.createdAt,
      deadline: job.deadline,
      skillsRequired: Array.isArray(job.skillsRequired) ? job.skillsRequired : [],
      createdBy: job.createdBy,
      assignedTo: job.assignedTo,
    },
    proposedAmount: application.proposedAmount,
    timeEstimate: application.timeEstimate,
    coverLetter: application.coverLetter,
    status: application.status,
    appliedAt: application.appliedAt,
    materialsList: Array.isArray(application.materialsList) ? application.materialsList : [],
  };
}

export function buildMatchQuery(
  fixerObjectId: Types.ObjectId,
  status: ApplicationStatus | null,
  search: string | null
): Record<string, unknown> {
  const applicationFilter: Record<string, unknown> = { fixer: fixerObjectId };
  if (status) applicationFilter.status = status;

  const matchQuery: Record<string, unknown> = {
    applications: { $elemMatch: applicationFilter },
  };

  if (search) {
    const sanitizedSearch = escapeRegex(search);
    matchQuery.$or = [
      { title: { $regex: sanitizedSearch, $options: 'i' } },
      { description: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  return matchQuery;
}
