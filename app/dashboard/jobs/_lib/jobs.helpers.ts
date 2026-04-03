import type {
  DashboardJob,
  TabStatus,
} from '@/app/dashboard/jobs/_lib/jobs.types';
import type { AppUser } from '@/app/providers';

export { normalizeJob, normalizeJobs, normalizePagination, normalizeEarnings } from './jobs.parsers';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

export function asTabStatus(value: unknown): TabStatus {
  return value === 'open' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'expired' ||
    value === 'cancelled'
    ? value
    : 'all';
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  if (isRecord(error)) {
    return asString(error.name) === 'AbortError';
  }

  return false;
}

export async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function getErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const message = asString(payload.message);
    if (message) {
      return message;
    }
  }
  return fallback;
}


export function formatCurrency(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN').format(amount);
}

export function getTimeRemaining(deadline: string | null): string {
  if (!deadline) {
    return 'No deadline';
  }
  const now = new Date();
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return 'No deadline';
  }
  const diff = deadlineDate.getTime() - now.getTime();
  if (diff <= 0) {
    return 'Expired';
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

export function getStatusText(job: DashboardJob): string {
  switch (job.status) {
    case 'open':
      return `Open (${job.applicationCount} applications)`;
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return job.completion.confirmedAt ? 'Completed - Confirmed' : 'Awaiting Confirmation';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return `Expired (${job.applicationCount} applications)`;
    default:
      return job.status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getPlanType(user: AppUser | null): string {
  if (!user || !isRecord(user.plan)) {
    return '';
  }
  return asString(user.plan.type);
}

export function getJobsPosted(user: AppUser | null): number {
  if (!user) {
    return 0;
  }
  return asNumber(user.jobsPosted) ?? 0;
}

export function getCreatedJobId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (isRecord(payload.data)) {
    const dataId = asString(payload.data.jobId) || asString(payload.data._id);
    if (dataId) {
      return dataId;
    }
  }
  if (isRecord(payload.job)) {
    const jobId = asString(payload.job._id) || asString(payload.job.id);
    if (jobId) {
      return jobId;
    }
  }
  const directId = asString(payload.jobId) || asString(payload._id);
  return directId || null;
}
