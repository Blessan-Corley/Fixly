import { Types } from 'mongoose';

export type SessionUser = {
  id?: string;
};

export type UserRole = 'fixer' | 'hirer' | 'admin';

export type UserRecord = {
  _id: Types.ObjectId | string;
  role?: unknown;
};

export type JobApplication = {
  fixer?: Types.ObjectId | string;
  status?: string;
  appliedAt?: string | Date;
  proposedAmount?: number;
};

export type JobRecord = {
  _id: Types.ObjectId | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  assignedTo?: unknown;
  applications?: JobApplication[];
  [key: string]: unknown;
};

export type RecentJobsResponse = {
  success: true;
  jobs: JobRecord[];
  total: number;
  role: UserRole;
  cached?: boolean;
  cacheTimestamp?: string;
};

export type CachedRecentJobs = RecentJobsResponse & {
  _cacheTimestamp?: string;
};

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(parsed, 20);
}

export function asRole(value: unknown): UserRole | null {
  if (value === 'fixer' || value === 'hirer' || value === 'admin') return value;
  return null;
}

export function toTimestamp(value: string | Date | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function getAssignedUserId(assignedTo: unknown): string | null {
  if (!assignedTo) return null;
  if (typeof assignedTo === 'string') return assignedTo;
  if (typeof assignedTo === 'object' && assignedTo !== null) {
    const id = (assignedTo as { _id?: unknown })._id;
    if (typeof id === 'string') return id;
    if (id && typeof id === 'object' && 'toString' in id) return String(id);
  }
  if (assignedTo && typeof assignedTo === 'object' && 'toString' in assignedTo) {
    return String(assignedTo);
  }
  return null;
}

export function parseCachedRecentJobs(value: unknown): CachedRecentJobs | null {
  if (!value) return null;

  const rawValue: unknown =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return null;
          }
        })()
      : value;

  if (!rawValue || typeof rawValue !== 'object') {
    return null;
  }

  const payload = rawValue as Record<string, unknown>;
  if (payload.success !== true) return null;
  if (!Array.isArray(payload.jobs)) return null;
  if (typeof payload.total !== 'number') return null;
  if (asRole(payload.role) === null) return null;

  return payload as CachedRecentJobs;
}
