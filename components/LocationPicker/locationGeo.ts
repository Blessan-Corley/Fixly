import { MAJOR_INDIAN_CITIES, isWithinIndiaBounds } from './locationConstants';
import type {
  Coordinates,
  LocationLike,
  LocationValidationResult,
  NearestCity,
} from './locationUtils.types';

export const getCurrentLocation = (): Promise<
  Coordinates & { accuracy: number; timestamp: number }
> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!isWithinIndiaBounds(latitude, longitude)) {
          reject(new Error('Location detected outside India'));
          return;
        }
        resolve({ lat: latitude, lng: longitude, accuracy, timestamp: position.timestamp });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            break;
        }
        reject(new Error(errorMessage));
      },
      options
    );
  });

export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const findNearestCity = (lat: number, lng: number): NearestCity | null => {
  let nearest: NearestCity | null = null;
  let minDist = Infinity;
  for (const city of MAJOR_INDIAN_CITIES) {
    const d = calculateDistance(lat, lng, city.lat, city.lng);
    if (d < minDist) {
      minDist = d;
      nearest = { ...city, distance: d };
    }
  }
  return nearest;
};

export const formatLocationName = (location: LocationLike | null | undefined): string => {
  if (!location) return 'Unknown Location';
  const parts: string[] = [];
  if (typeof location.name === 'string' && location.name) parts.push(location.name);
  if (typeof location.locality === 'string' && location.locality) parts.push(location.locality);
  if (typeof location.city === 'string' && location.city) parts.push(location.city);
  if (typeof location.state === 'string' && location.state) parts.push(location.state);
  return parts.join(', ') || 'Selected Location';
};

export const validateLocation = (location: unknown): LocationValidationResult => {
  if (!location || typeof location !== 'object') {
    return { valid: false, error: 'Location is required' };
  }
  const c = location as LocationLike;
  const isFinite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!isFinite(c.lat) || !isFinite(c.lng)) {
    return { valid: false, error: 'Invalid coordinates' };
  }
  if (!isWithinIndiaBounds(c.lat, c.lng)) {
    return { valid: false, error: 'Location must be within India' };
  }
  return { valid: true };
};
