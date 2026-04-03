import type { CitySearchResult, JobRecord } from './edit.types';

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

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );
}

export function normalizeCityResults(value: unknown): CitySearchResult[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((city) => {
      if (!isRecord(city)) return null;
      const name = asString(city.name);
      const state = asString(city.state);
      const lat = asNumber(city.lat);
      const lng = asNumber(city.lng);
      if (!name || !state || lat === null || lng === null) return null;
      return { name, state, lat, lng };
    })
    .filter((city): city is CitySearchResult => city !== null);
}

export function normalizeJob(value: unknown): JobRecord | null {
  if (!isRecord(value)) return null;

  const jobId = asString(value._id) || asString(value.id);
  if (!jobId) return null;

  return {
    _id: jobId,
    title: asString(value.title),
    description: asString(value.description),
    skillsRequired: normalizeStringArray(value.skillsRequired),
    budget: isRecord(value.budget)
      ? {
          type:
            value.budget.type === 'fixed' ||
            value.budget.type === 'hourly' ||
            value.budget.type === 'negotiable'
              ? value.budget.type
              : 'negotiable',
          amount: (() => {
            const numericAmount = asNumber(value.budget.amount);
            if (numericAmount !== null) {
              return numericAmount;
            }
            const stringAmount = asString(value.budget.amount);
            return stringAmount || undefined;
          })(),
          materialsIncluded: value.budget.materialsIncluded === true,
        }
      : undefined,
    location: isRecord(value.location)
      ? {
          address: asString(value.location.address),
          city: asString(value.location.city),
          state: asString(value.location.state),
          pincode: asString(value.location.pincode),
          lat: value.location.lat as number | string | null | undefined,
          lng: value.location.lng as number | string | null | undefined,
        }
      : undefined,
    deadline: asString(value.deadline),
    urgency: value.urgency === 'asap' || value.urgency === 'scheduled' ? value.urgency : 'flexible',
    type: value.type === 'recurring' ? 'recurring' : 'one-time',
    experienceLevel:
      value.experienceLevel === 'beginner' || value.experienceLevel === 'expert'
        ? value.experienceLevel
        : 'intermediate',
    scheduledDate: asString(value.scheduledDate),
    estimatedDuration: isRecord(value.estimatedDuration)
      ? {
          value: value.estimatedDuration.value as number | string | undefined,
          unit: value.estimatedDuration.unit === 'days' ? 'days' : 'hours',
        }
      : undefined,
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
