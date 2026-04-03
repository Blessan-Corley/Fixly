import type { JobSearchResult } from './search.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
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

export async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function normalizeCitySuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cityNames: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      cityNames.push(entry);
      continue;
    }

    if (!isRecord(entry)) {
      continue;
    }

    const name = asString(entry.name);
    const state = asString(entry.state);
    if (!name) {
      continue;
    }

    cityNames.push(state ? `${name}, ${state}` : name);
  }

  return cityNames.slice(0, 10);
}

export function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (skill): skill is string => typeof skill === 'string' && skill.trim().length > 0
  );
}

function normalizeJob(value: unknown): JobSearchResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value._id) || asString(value.id);
  if (!id) {
    return null;
  }

  const location = isRecord(value.location) ? value.location : {};
  const views = isRecord(value.views) ? value.views : {};
  const budget = isRecord(value.budget) ? value.budget : {};

  return {
    _id: id,
    title: asString(value.title) || 'Untitled job',
    description: asString(value.description) || 'No description provided.',
    urgency: asString(value.urgency) || 'low',
    status: asString(value.status) || 'open',
    createdAt: asString(value.createdAt) || new Date().toISOString(),
    skillsRequired: normalizeSkills(value.skillsRequired),
    location: {
      city: asString(location.city) || undefined,
    },
    applicationCount:
      asNumber(value.applicationCount) ??
      (Array.isArray(value.applications) ? value.applications.length : 0),
    commentCount: asNumber(value.commentCount) ?? 0,
    applications: Array.isArray(value.applications) ? value.applications : [],
    views: {
      count: asNumber(views.count) ?? 0,
    },
    budget: {
      type: asString(budget.type) || 'negotiable',
      amount: asNumber(budget.amount) ?? undefined,
      min: asNumber(budget.min) ?? undefined,
      max: asNumber(budget.max) ?? undefined,
    },
  };
}

export function normalizeJobs(value: unknown): JobSearchResult[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((job) => normalizeJob(job))
    .filter((job): job is JobSearchResult => job !== null);
}
