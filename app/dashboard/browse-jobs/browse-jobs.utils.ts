import type { AppUser } from '../../providers';

import type { BrowseJob, FixerUser } from './browse-jobs.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function toNumberSafe(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function toId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (isRecord(value)) {
    if (typeof value._id === 'string') return value._id;
    if (typeof value.id === 'string') return value.id;
    if (typeof value.toString === 'function') {
      const candidate = value.toString();
      if (candidate && candidate !== '[object Object]') return candidate;
    }
  }
  return '';
}

export function normalizeJob(payload: unknown): BrowseJob | null {
  if (!isRecord(payload)) return null;
  const budget = isRecord(payload.budget) ? payload.budget : {};
  const location = isRecord(payload.location) ? payload.location : {};
  const views = isRecord(payload.views) ? payload.views : {};
  const applicationsRaw = Array.isArray(payload.applications) ? payload.applications : [];

  return {
    _id: toId(payload._id),
    title: toStringSafe(payload.title, 'Untitled job'),
    description: toStringSafe(payload.description, ''),
    urgency: toStringSafe(payload.urgency, ''),
    createdAt: toStringSafe(payload.createdAt, ''),
    deadline: toStringSafe(payload.deadline, ''),
    budget: {
      type: toStringSafe(budget.type, ''),
      amount: toNumberSafe(budget.amount, 0),
      materialsIncluded: budget.materialsIncluded === true,
    },
    location: {
      lat: toNumberSafe(location.lat, Number.NaN),
      lng: toNumberSafe(location.lng, Number.NaN),
      city: toStringSafe(location.city, ''),
      state: toStringSafe(location.state, ''),
    },
    skillsRequired: Array.isArray(payload.skillsRequired)
      ? payload.skillsRequired.map((skill) => toStringSafe(skill)).filter(Boolean)
      : [],
    applications: applicationsRaw.map((application) => {
      const source = isRecord(application) ? application : {};
      return {
        fixer: toId(source.fixer),
        status: toStringSafe(source.status, ''),
      };
    }),
    views: {
      count: toNumberSafe(views.count, 0),
    },
    commentCount: toNumberSafe(payload.commentCount, 0),
    applicationCount: toNumberSafe(payload.applicationCount, 0),
    hasApplied: payload.hasApplied === true,
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function normalizeFixerUser(user: AppUser | null): FixerUser {
  const plan = isRecord(user?.plan) ? user?.plan : {};
  return {
    role: toStringSafe(user?.role, ''),
    banned: user?.banned === true,
    planType: toStringSafe(plan.type, ''),
    planStatus: toStringSafe(plan.status, ''),
    creditsUsed: toNumberSafe(plan.creditsUsed, 0),
  };
}
