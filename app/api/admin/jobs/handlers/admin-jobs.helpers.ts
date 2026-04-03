import { Types } from 'mongoose';

import type { AdminJobAction, JobStatus, JobUrgency, LeanJobRecord, SortBy } from './admin-jobs.types';

export function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function parseSortBy(value: string | null): SortBy {
  const normalized = toTrimmedString(value)?.toLowerCase();
  if (
    normalized === 'newest' ||
    normalized === 'oldest' ||
    normalized === 'deadline' ||
    normalized === 'budget_high' ||
    normalized === 'budget_low'
  ) {
    return normalized;
  }
  return 'newest';
}

export function parseStatus(value: string | null): JobStatus | null {
  if (
    value === 'open' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'cancelled' ||
    value === 'disputed'
  ) {
    return value;
  }
  return null;
}

export function parseUrgency(value: string | null): JobUrgency | null {
  if (value === 'asap' || value === 'flexible' || value === 'scheduled') return value;
  return null;
}

export function parseAction(value: unknown): AdminJobAction | null {
  const action = toTrimmedString(value)?.toLowerCase();
  if (
    action === 'cancel' ||
    action === 'feature' ||
    action === 'unfeature' ||
    action === 'resolve_dispute'
  ) {
    return action;
  }
  return null;
}

export function parseJobIds(value: unknown): Types.ObjectId[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids: Types.ObjectId[] = [];
  for (const rawId of value) {
    const id = toTrimmedString(rawId);
    if (!id || !Types.ObjectId.isValid(id)) return null;
    ids.push(new Types.ObjectId(id));
  }
  return ids;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function toIdString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === 'object' && value !== null) {
    const maybeId = (value as { _id?: unknown })._id;
    if (typeof maybeId === 'string') return maybeId;
    if (maybeId instanceof Types.ObjectId) return maybeId.toString();
    if ('toString' in value) return String(value);
  }
  return null;
}

export async function notifyUser(
  user: Record<string, unknown> | null,
  type: string,
  title: string,
  message: string
): Promise<void> {
  if (!user || typeof user.addNotification !== 'function') return;
  await user.addNotification(type, title, message);
}

export function buildEnhancedJob(job: LeanJobRecord, now: number): Record<string, unknown> {
  const createdAt = toDate(job.createdAt);
  const deadline = toDate(job.deadline);
  const daysOld = createdAt
    ? Math.max(0, Math.floor((now - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  return {
    ...job,
    applicationCount: Array.isArray(job.applications) ? job.applications.length : 0,
    isExpired: deadline ? deadline.getTime() < now : false,
    daysOld,
    applications: undefined,
  };
}
