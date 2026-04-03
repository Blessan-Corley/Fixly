'use client';

import type { SelectedLocation } from './location.types';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type GeocodeCacheEntry = {
  data?: unknown;
  timestamp?: number;
};

export function buildGeocodeCacheKey(lat: number, lng: number): string {
  return `geocode_${lat.toFixed(5)}_${lng.toFixed(5)}`;
}

export function getCachedGeocode(cacheKey: string): SelectedLocation | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as GeocodeCacheEntry;
    if (typeof parsed.timestamp !== 'number' || Date.now() - parsed.timestamp >= CACHE_TTL_MS) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return null;
    }

    return parsed.data as SelectedLocation;
  } catch {
    return null;
  }
}

export function setCachedGeocode(cacheKey: string, location: SelectedLocation): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: location,
        timestamp: Date.now(),
      } satisfies GeocodeCacheEntry)
    );
  } catch (error: unknown) {
    console.warn('Failed to cache geocoding result:', error);
  }
}
