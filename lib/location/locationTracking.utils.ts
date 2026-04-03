import type { LocationEntry, LocationType } from './locationTracking.types';

export const LOCATION_CONFIG = {
  TRACKING_INTERVAL: 30 * 60 * 1000,
  MIN_DISTANCE_THRESHOLD: 500,
  MAX_LOCATION_HISTORY: 50,
  CACHE_TTL: {
    CURRENT_LOCATION: 30 * 60,
    LOCATION_HISTORY: 24 * 60 * 60,
    HOME_ADDRESS: 7 * 24 * 60 * 60,
    RECENT_LOCATIONS: 2 * 60 * 60,
  },
} as const;

export const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const parseJson = <T>(value: unknown, fallback: T): T => {
  if (!value) return fallback;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return fallback;
};

export const normalizeLocationType = (value: string): LocationType => {
  if (value === 'gps' || value === 'manual' || value === 'home' || value === 'network') {
    return value;
  }
  return 'gps';
};

export const createLocationEntry = (
  lat: number,
  lng: number,
  address: string | null = null,
  locationType: LocationType = 'gps'
): LocationEntry => ({
  lat,
  lng,
  address,
  locationType,
  timestamp: new Date().toISOString(),
  accuracy: null,
});
