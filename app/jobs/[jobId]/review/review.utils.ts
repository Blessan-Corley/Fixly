import type { JobParticipant, JobReviewDetails } from './review.types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function getParticipantId(participant: JobParticipant | null | undefined): string {
  return participant?._id ?? '';
}

export function normalizeParticipant(value: unknown): JobParticipant | null {
  if (!isRecord(value)) return null;

  const id = asString(value._id) || asString(value.id);
  if (!id) return null;

  const rating = isRecord(value.rating)
    ? {
        average: asNumber(value.rating.average),
        count: asNumber(value.rating.count),
      }
    : undefined;

  return {
    _id: id,
    name: asString(value.name) || 'User',
    username: asString(value.username) || 'unknown',
    photoURL: asString(value.photoURL) || undefined,
    rating,
  };
}

export function normalizeJob(value: unknown): JobReviewDetails | null {
  if (!isRecord(value)) return null;

  const client = normalizeParticipant(value.client ?? value.createdBy);
  if (!client) return null;

  const fixer = normalizeParticipant(value.fixer ?? value.assignedTo);
  const location = isRecord(value.location) ? value.location : {};
  const budget = isRecord(value.budget) ? value.budget : {};
  const completion = isRecord(value.completion) ? value.completion : {};

  return {
    _id: asString(value._id) || asString(value.id),
    title: asString(value.title) || 'Untitled job',
    category: asString(value.category) || 'general',
    status: asString(value.status) || 'open',
    location: {
      address:
        asString(location.address) || asString(location.city) || 'Location not specified',
    },
    budget: {
      amount: asNumber(budget.amount),
    },
    completedAt:
      asString(value.completedAt) || asString(completion.completedAt) || '',
    client,
    fixer,
  };
}

export async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
