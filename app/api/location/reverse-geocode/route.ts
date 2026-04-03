import { z } from 'zod';

import { parseBody } from '@/lib/api/parse';
import { badRequest, respond, tooManyRequests } from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { rateLimit } from '@/utils/rateLimiting';

const ReverseGeocodeSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

type ReverseGeocodeRequestBody = z.infer<typeof ReverseGeocodeSchema>;

type GoogleAddressComponent = {
  long_name?: string;
  types?: string[];
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
};

type GeocodeLocation = {
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

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

function parseCachedLocation(value: unknown): GeocodeLocation | null {
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

function buildBasicLocation(): GeocodeLocation {
  return {
    formatted_address: 'Unknown location',
    city: '',
    locality: '',
    area: '',
    state: '',
    country: 'India',
    postal_code: '',
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function extractGoogleLocation(result: GoogleGeocodeResult): GeocodeLocation {
  const components = Array.isArray(result.address_components) ? result.address_components : [];
  const locationData: GeocodeLocation = {
    formatted_address: result.formatted_address || 'Unknown location',
    city: '',
    locality: '',
    area: '',
    state: '',
    country: '',
    postal_code: '',
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
    const fallback = components.find((component) => {
      const types = Array.isArray(component.types) ? component.types : [];
      return (
        types.includes('administrative_area_level_2') ||
        types.includes('administrative_area_level_3')
      );
    });
    if (fallback?.long_name) {
      locationData.city = fallback.long_name;
      locationData.locality = fallback.long_name;
    }
  }

  return locationData;
}

async function cacheLocation(cacheKey: string, value: GeocodeLocation): Promise<void> {
  try {
    await redisUtils.setex(cacheKey, 86400, value);
  } catch (error: unknown) {
    logger.warn('Failed to cache reverse geocode result:', error);
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'reverse_geocode', 60, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const parsedBody = await parseBody(request, ReverseGeocodeSchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }
    const parsed: ReverseGeocodeRequestBody = parsedBody.data;

    const latitude = parsed.latitude ?? parsed.lat ?? null;
    const longitude = parsed.longitude ?? parsed.lng ?? null;
    if (latitude === null || longitude === null) {
      return badRequest('Latitude and longitude are required');
    }

    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
      return badRequest('Invalid coordinates');
    }

    const cacheKey = `geocode:${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    try {
      const cached = parseCachedLocation(await redisUtils.get(cacheKey));
      if (cached) {
        return respond(cached);
      }
    } catch (error: unknown) {
      logger.warn('Reverse geocode cache read failed:', error);
    }

    const googleMapsApiKey = env.GOOGLE_MAPS_API_KEY;
    if (googleMapsApiKey) {
      try {
        const googleResponse = await fetchWithTimeout(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`,
          8000
        );

        if (googleResponse.ok) {
          const data = (await googleResponse.json()) as { results?: GoogleGeocodeResult[] };
          const firstResult = Array.isArray(data.results) ? data.results[0] : null;
          if (firstResult) {
            const locationData = extractGoogleLocation(firstResult);
            await cacheLocation(cacheKey, locationData);
            return respond(locationData);
          }
        }
      } catch (error: unknown) {
        logger.warn('Google reverse geocode failed:', error);
      }
    }

    try {
      const fallbackResponse = await fetchWithTimeout(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
        8000
      );

      if (fallbackResponse.ok) {
        const data = (await fallbackResponse.json()) as {
          locality?: string;
          city?: string;
          principalSubdivision?: string;
          countryName?: string;
          postcode?: string;
        };

        const locationData: GeocodeLocation = {
          formatted_address: data.locality || data.city || 'Unknown location',
          city: data.city || data.locality || '',
          locality: data.locality || data.city || '',
          area: data.principalSubdivision || '',
          state: data.principalSubdivision || '',
          country: data.countryName || '',
          postal_code: data.postcode || '',
        };

        await cacheLocation(cacheKey, locationData);
        return respond(locationData);
      }
    } catch (error: unknown) {
      logger.warn('Fallback reverse geocode failed:', error);
    }

    return respond(buildBasicLocation());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Reverse geocoding error:', message);
    return respond(
      {
        message: 'Failed to get location details',
        error: env.NODE_ENV === 'development' ? message : undefined,
      },
      500
    );
  }
}
