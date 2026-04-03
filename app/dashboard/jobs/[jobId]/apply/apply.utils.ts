import type { AppUser } from '@/app/providers';

import type {
  JobApplicationEntry,
  JobBudget,
  JobCreator,
  JobDetails,
} from './apply.types';

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

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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

export function getResponseMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const message = asString(payload.message);
    if (message) {
      return message;
    }
  }
  return fallback;
}

export function normalizeBudget(value: unknown): JobBudget {
  if (!isRecord(value)) {
    return { type: 'negotiable', amount: null, min: null, max: null };
  }
  return {
    type: asString(value.type) || 'negotiable',
    amount: asNumber(value.amount),
    min: asNumber(value.min),
    max: asNumber(value.max),
  };
}

export function normalizeCreator(value: unknown): JobCreator {
  if (!isRecord(value)) {
    return { name: 'Client', rating: { average: null, count: 0 } };
  }
  const ratingRecord = isRecord(value.rating) ? value.rating : {};
  return {
    name: asString(value.name) || asString(value.username) || 'Client',
    rating: {
      average: asNumber(ratingRecord.average),
      count: asNumber(ratingRecord.count) ?? 0,
    },
  };
}

function normalizeApplications(value: unknown): JobApplicationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      return { fixer: asString(entry.fixer) } satisfies JobApplicationEntry;
    })
    .filter((entry): entry is JobApplicationEntry => entry !== null);
}

export function normalizeJobDetails(value: unknown): JobDetails | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = asString(value._id) || asString(value.id);
  if (!id) {
    return null;
  }
  return {
    _id: id,
    title: asString(value.title) || 'Untitled job',
    budget: normalizeBudget(value.budget),
    createdBy: normalizeCreator(value.createdBy),
    hasApplied: asBoolean(value.hasApplied),
    skillsRequired: asStringArray(value.skillsRequired),
    applications: normalizeApplications(value.applications),
  };
}

export function formatCurrency(amount: number | null | undefined): string {
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatBudget(budget: JobBudget): string {
  if (budget.type === 'negotiable') {
    return 'Negotiable';
  }
  if (budget.type === 'fixed') {
    return `Rs. ${formatCurrency(budget.amount)}`;
  }
  if (budget.min !== null || budget.max !== null) {
    return `Rs. ${formatCurrency(budget.min)} - Rs. ${formatCurrency(budget.max)}`;
  }
  return `Rs. ${formatCurrency(budget.amount)}`;
}

export function getDefaultProposedAmount(budget: JobBudget): string {
  if (budget.type === 'fixed' && budget.amount !== null) {
    return String(Math.max(1, Math.round(budget.amount)));
  }
  if (budget.min !== null) {
    return String(Math.max(1, Math.round(budget.min)));
  }
  return '';
}

export function getUserId(user: AppUser | null): string {
  if (!user) {
    return '';
  }
  return asString(user.id) || asString(user._id);
}

export function getPlanSummary(user: AppUser | null): { type: string; creditsUsed: number } {
  if (!user || !isRecord(user.plan)) {
    return { type: 'free', creditsUsed: 0 };
  }
  return {
    type: asString(user.plan.type) || 'free',
    creditsUsed: asNumber(user.plan.creditsUsed) ?? 0,
  };
}

export function getUserSkills(user: AppUser | null): string[] {
  if (!user || !Array.isArray(user.skills)) {
    return [];
  }
  return user.skills
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.toLowerCase().trim())
    .filter((entry) => entry.length > 0);
}
