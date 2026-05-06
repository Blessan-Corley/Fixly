import type { CityCoordinate, Coordinates } from './types';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export const DISTANCE_RANGES = [
  { label: 'Within 2km', value: 2, priority: 'high' },
  { label: 'Within 5km', value: 5, priority: 'medium' },
  { label: 'Within 10km', value: 10, priority: 'low' },
  { label: 'Within 25km', value: 25, priority: 'very-low' },
  { label: 'Any distance', value: null, priority: 'none' },
] as const;

// Haversine formula to calculate distance between two points.
export function calculateDistance(
  lat1?: number | null,
  lng1?: number | null,
  lat2?: number | null,
  lng2?: number | null
): number | null {
  if (
    !isFiniteNumber(lat1) ||
    !isFiniteNumber(lng1) ||
    !isFiniteNumber(lat2) ||
    !isFiniteNumber(lng2)
  ) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers.
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(distanceKm?: number | null): string {
  if (!isFiniteNumber(distanceKm) || distanceKm <= 0) return '';

  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
  return `${Math.round(distanceKm)}km`;
}

export function getCityCoordinates(
  cityName: string,
  citiesData: CityCoordinate[]
): Coordinates | null {
  if (!cityName || !Array.isArray(citiesData)) return null;

  const city = citiesData.find((entry) => entry.name.toLowerCase() === cityName.toLowerCase());
  return city ? { lat: city.lat, lng: city.lng } : null;
}

export function getDistancePriority(distanceKm?: number | null): number {
  if (!isFiniteNumber(distanceKm) || distanceKm <= 0) return 0;

  if (distanceKm <= 2) return 4;
  if (distanceKm <= 5) return 3;
  if (distanceKm <= 10) return 2;
  if (distanceKm <= 25) return 1;
  return 0;
}

// Re-export sorting/filtering utilities
export { sortJobsByDistance, filterJobsByRadius } from './geo.sorting';
