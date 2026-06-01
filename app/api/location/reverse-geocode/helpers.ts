import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';

export type GoogleAddressComponent = {
  long_name?: string;
  types?: string[];
};

export type GoogleGeocodeResult = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
};

export type GeocodeLocation = {
  formatted_address: string;
  city: string;
  locality: string;
  area: string;
  state: string;
  country: string;
  postal_code: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

export function parseCachedLocation(value: unknown): GeocodeLocation | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isPlainObject(parsed) ? (parsed as GeocodeLocation) : null;
    } catch {
      return null;
    }
  }
  return isPlainObject(value) ? (value as GeocodeLocation) : null;
}

export function buildBasicLocation(): GeocodeLocation {
  return { formatted_address: 'Unknown location', city: '', locality: '', area: '', state: '', country: 'India', postal_code: '' };
}

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function extractGoogleLocation(result: GoogleGeocodeResult): GeocodeLocation {
  const components = Array.isArray(result.address_components) ? result.address_components : [];
  const locationData: GeocodeLocation = {
    formatted_address: result.formatted_address || 'Unknown location',
    city: '', locality: '', area: '', state: '', country: '', postal_code: '',
  };

  components.forEach((component) => {
    const types = Array.isArray(component.types) ? component.types : [];
    const name = component.long_name || '';
    if (types.includes('locality')) {
      locationData.city = name;
      locationData.locality = name;
    } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      locationData.area = name;
    } else if (types.includes('administrative_area_level_1')) {
      locationData.state = name;
    } else if (types.includes('country')) {
      locationData.country = name;
    } else if (types.includes('postal_code')) {
      locationData.postal_code = name;
    }
  });

  if (!locationData.city) {
    const fallback = components.find((c) => {
      const t = Array.isArray(c.types) ? c.types : [];
      return t.includes('administrative_area_level_2') || t.includes('administrative_area_level_3');
    });
    if (fallback?.long_name) {
      locationData.city = fallback.long_name;
      locationData.locality = fallback.long_name;
    }
  }

  return locationData;
}

export async function cacheLocation(cacheKey: string, value: GeocodeLocation): Promise<void> {
  try {
    await redisUtils.setex(cacheKey, 86400, value);
  } catch (error: unknown) {
    logger.warn('Failed to cache reverse geocode result:', error);
  }
}
