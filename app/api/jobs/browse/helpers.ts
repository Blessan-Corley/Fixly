import crypto from 'crypto';

import { countActiveApplicationsOnJob } from '@/models/job/workflow';

export const BROWSE_CACHE_TTL = 30; // seconds — short enough to stay fresh for a marketplace

export type BrowseJobApplication = {
  fixer?: unknown;
  status?: string;
};

export type BrowseJob = {
  applications?: BrowseJobApplication[];
  comments?: unknown[];
  createdBy?: unknown;
  [key: string]: unknown;
};

export type BudgetAmountFilter = {
  $gte?: number;
  $lte?: number;
};

export type BrowseQuery = {
  status: 'open';
  $and?: Array<Record<string, unknown>>;
  $text?: { $search: string };
  urgency?: string;
  skillsRequired?: { $in: string[] };
  'budget.amount'?: BudgetAmountFilter;
};

export type SortValue = 1 | -1 | { $meta: 'textScore' };

export const ALLOWED_SORT_FIELDS = new Set([
  'relevance',
  'newest',
  'deadline',
  'budget_high',
  'budget_low',
  'popular',
  'distance',
]);

export function buildBrowseCacheKey(searchParams: URLSearchParams, userId: string | null): string {
  const sorted = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const hash = crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16);
  const userPart = userId ? `u:${userId.slice(-8)}` : 'anon';
  return `browse:v1:${userPart}:${hash}`;
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value || '', 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function parseOptionalNumber(value: string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return String(value);
}

export function buildSort(sortByRaw: string, hasSearch: boolean): Record<string, SortValue> {
  const sortBy = ALLOWED_SORT_FIELDS.has(sortByRaw) ? sortByRaw : 'newest';

  switch (sortBy) {
    case 'relevance':
      return hasSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 };
    case 'deadline':
      return { deadline: 1, createdAt: -1 };
    case 'budget_high':
      return { 'budget.amount': -1, createdAt: -1 };
    case 'budget_low':
      return { 'budget.amount': 1, createdAt: -1 };
    case 'popular':
      return { 'views.count': -1, createdAt: -1 };
    case 'distance':
      // Distance sorting is handled client-side after geolocation.
      return { createdAt: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
}

export type BrowseQueryOptions = {
  search: string;
  location: string;
  urgency: string;
  skills: string[];
  budgetMin: number | null;
  budgetMax: number | null;
};

export function buildBrowseQuery(opts: BrowseQueryOptions): BrowseQuery {
  const { search, location, urgency, skills, budgetMin, budgetMax } = opts;
  const query: BrowseQuery = { status: 'open' };

  if (search) query.$text = { $search: search };

  if (location) {
    const locationRegex = new RegExp(escapeRegex(location), 'i');
    query.$and = query.$and ?? [];
    query.$and.push({ $or: [{ 'location.city': locationRegex }, { 'location.state': locationRegex }] });
  }

  if (urgency && ['asap', 'flexible', 'scheduled'].includes(urgency)) query.urgency = urgency;
  if (skills.length > 0) query.skillsRequired = { $in: skills };

  if (budgetMin !== null || budgetMax !== null) {
    query['budget.amount'] = {};
    if (budgetMin !== null) (query['budget.amount'] as BudgetAmountFilter).$gte = budgetMin;
    if (budgetMax !== null) (query['budget.amount'] as BudgetAmountFilter).$lte = budgetMax;
  }

  return query;
}

export function mapBrowseJob(
  job: BrowseJob,
  viewerUserId: string | null
): BrowseJob & {
  applicationCount: number;
  commentCount: number;
  hasApplied: boolean;
  applications: { fixer: string; status?: string }[];
  client: unknown;
  hirer: unknown;
  fixer: null;
} {
  const allApplications = Array.isArray(job.applications) ? job.applications : [];
  const applicationCount = countActiveApplicationsOnJob({ applications: allApplications });

  const hasApplied =
    !!viewerUserId &&
    allApplications.some(
      (app) => app?.status !== 'withdrawn' && toIdString(app?.fixer) === viewerUserId
    );

  const minimalApplications = hasApplied
    ? allApplications
        .filter((app) => toIdString(app?.fixer) === viewerUserId && app?.status !== 'withdrawn')
        .map((app) => ({ fixer: toIdString(app?.fixer), status: app?.status }))
    : [];

  const createdBy = job.createdBy ?? null;
  return {
    ...job,
    applicationCount,
    commentCount: Array.isArray(job.comments) ? job.comments.length : 0,
    hasApplied,
    applications: minimalApplications,
    client: createdBy,
    hirer: createdBy,
    fixer: null,
  };
}
