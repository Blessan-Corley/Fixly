import type { StoredLocation, UserLocation } from './types';

export const LOCATION_STORAGE_KEYS = {
  USER_LOCATION: 'fixly_user_location',
  LOCATION_PERMISSION: 'fixly_location_permission',
  PREFERRED_RADIUS: 'fixly_preferred_radius',
  LOCATION_ENABLED: 'fixly_location_enabled',
} as const;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function saveUserLocation(location: UserLocation): boolean {
  if (!canUseStorage()) return false;

  try {
    const payload: StoredLocation = {
      ...location,
      timestamp: Date.now(),
      expiresIn: 6 * 60 * 60 * 1000,
      source: 'gps',
    };

    localStorage.setItem(LOCATION_STORAGE_KEYS.USER_LOCATION, JSON.stringify(payload));
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_ENABLED, 'true');
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_PERMISSION, 'granted');
    return true;
  } catch (error) {
    console.error('Failed to save user location:', error);
    return false;
  }
}

export function loadUserLocation(): UserLocation | null {
  if (!canUseStorage()) return null;

  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEYS.USER_LOCATION);
    if (!stored) return null;

    const data = JSON.parse(stored) as Partial<StoredLocation>;
    const sixHours = 6 * 60 * 60 * 1000;
    const timestamp = data.timestamp ?? 0;

    if (Date.now() - timestamp < sixHours && isFiniteNumber(data.lat) && isFiniteNumber(data.lng)) {
      return {
        lat: data.lat,
        lng: data.lng,
        city: data.city,
        state: data.state,
      };
    }

    clearUserLocation();
    return null;
  } catch (error) {
    console.error('Failed to load user location:', error);
    return null;
  }
}

export function clearUserLocation(): void {
  if (!canUseStorage()) return;

  try {
    localStorage.removeItem(LOCATION_STORAGE_KEYS.USER_LOCATION);
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_ENABLED, 'false');
  } catch (error) {
    console.error('Failed to clear user location:', error);
  }
}

export function saveLocationRejection(): boolean {
  if (!canUseStorage()) return false;

  try {
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_PERMISSION, 'denied');
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_ENABLED, 'false');
    return true;
  } catch (error) {
    console.error('Failed to save location rejection:', error);
    return false;
  }
}

export function isLocationRejected(): boolean {
  if (!canUseStorage()) return false;

  try {
    return localStorage.getItem(LOCATION_STORAGE_KEYS.LOCATION_PERMISSION) === 'denied';
  } catch {
    return false;
  }
}
