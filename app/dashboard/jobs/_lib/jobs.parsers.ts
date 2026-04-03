import type {
  DashboardJob,
  EarningsState,
  JobApplication,
  PaginationState,
} from '@/app/dashboard/jobs/_lib/jobs.types';
import {
  DEFAULT_EARNINGS,
  DEFAULT_PAGINATION,
} from '@/app/dashboard/jobs/_lib/jobs.types';

import { isRecord, asString, asNumber, asBoolean } from './jobs.helpers';

function toIsoDate(value: unknown): string | null {
  const raw = value instanceof Date ? value.toISOString() : asString(value);
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeApplications(value: unknown): JobApplication[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      return {
        status: asString(entry.status) || 'unknown',
      } satisfies JobApplication;
    })
    .filter((entry): entry is JobApplication => entry !== null);
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  for (const skill of value) {
    if (typeof skill !== 'string') {
      continue;
    }

    const normalized = skill.trim();
    if (!normalized) {
      continue;
    }
    unique.add(normalized);
  }

  return Array.from(unique);
}

export function normalizeJob(value: unknown): DashboardJob | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value._id) || asString(value.id);
  if (!id) {
    return null;
  }

  const budget = isRecord(value.budget) ? value.budget : {};
  const location = isRecord(value.location) ? value.location : {};
  const completion = isRecord(value.completion) ? value.completion : {};
  const views = isRecord(value.views) ? value.views : {};
  const applications = normalizeApplications(value.applications);
  const explicitApplicationCount = asNumber(value.applicationCount);
  const nonWithdrawnApplications = applications.filter(
    (application) => application.status !== 'withdrawn'
  ).length;

  return {
    _id: id,
    title: asString(value.title) || 'Untitled job',
    description: asString(value.description) || 'No description provided.',
    status: asString(value.status) || 'open',
    featured: asBoolean(value.featured),
    deadline: toIsoDate(value.deadline),
    createdAt: toIsoDate(value.createdAt) || new Date().toISOString(),
    skillsRequired: normalizeSkills(value.skillsRequired),
    applicationCount: explicitApplicationCount ?? nonWithdrawnApplications,
    applications,
    budget: {
      type: asString(budget.type) || 'negotiable',
      amount: asNumber(budget.amount),
    },
    location: {
      city: asString(location.city) || 'Remote',
    },
    completion: {
      confirmedAt: toIsoDate(completion.confirmedAt),
    },
    views: {
      count: asNumber(views.count) ?? 0,
    },
    experienceLevel: asString(value.experienceLevel) || 'intermediate',
    urgency: asString(value.urgency) || 'flexible',
    type: asString(value.type) || 'one-time',
    estimatedDuration: value.estimatedDuration,
    scheduledDate: toIsoDate(value.scheduledDate),
  };
}

export function normalizeJobs(value: unknown): DashboardJob[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((job) => normalizeJob(job)).filter((job): job is DashboardJob => job !== null);
}

export function normalizePagination(value: unknown, requestedPage: number): PaginationState {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_PAGINATION,
      page: requestedPage,
      hasMore: false,
    };
  }

  const page = asNumber(value.page) ?? requestedPage;
  const limit = asNumber(value.limit) ?? DEFAULT_PAGINATION.limit;
  const total = asNumber(value.total) ?? 0;
  const totalPages = asNumber(value.totalPages) ?? (limit > 0 ? Math.ceil(total / limit) : 0);
  const hasMore = typeof value.hasMore === 'boolean' ? value.hasMore : page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
  };
}

export function normalizeEarnings(value: unknown): EarningsState {
  if (!isRecord(value)) {
    return DEFAULT_EARNINGS;
  }

  return {
    total: asNumber(value.total) ?? 0,
    thisMonth: asNumber(value.thisMonth) ?? 0,
    completedJobs: asNumber(value.completedJobs) ?? 0,
  };
}
