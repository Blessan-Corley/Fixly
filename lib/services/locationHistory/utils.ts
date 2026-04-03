import type { LocationEntry, LocationInput } from './types';

export const parseJSON = <T>(value: unknown): T | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const toSafeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function normalizeLocationInput(location: LocationInput): LocationEntry | null {
  const latitude = toSafeNumber(location.latitude ?? location.lat);
  const longitude = toSafeNumber(location.longitude ?? location.lng);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    coordinates: {
      latitude,
      longitude,
    },
    address: toStringOrNull(location.address),
    city: toStringOrNull(location.city),
    state: toStringOrNull(location.state),
    accuracy: toSafeNumber(location.accuracy),
    timestamp: new Date(),
  };
}

export function isStaleTimestamp(timestamp: string | undefined, thresholdMs: number): boolean {
  if (!timestamp) {
    return true;
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  return Date.now() - parsed.getTime() >= thresholdMs;
}
