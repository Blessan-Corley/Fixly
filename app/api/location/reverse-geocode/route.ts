import { z } from 'zod';

import { parseBody } from '@/lib/api/parse';
import { badRequest, respond, tooManyRequests } from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { rateLimit } from '@/utils/rateLimiting';

import {
  buildBasicLocation,
  cacheLocation,
  extractGoogleLocation,
  fetchWithTimeout,
  isValidLatitude,
  isValidLongitude,
  parseCachedLocation,
  type GeocodeLocation,
  type GoogleGeocodeResult,
} from './helpers';

const ReverseGeocodeSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'reverse_geocode', 60, 60 * 1000);
    if (!rateLimitResult.success) return tooManyRequests('Too many requests. Please try again later.');

    const parsedBody = await parseBody(request, ReverseGeocodeSchema);
    if ('error' in parsedBody) return parsedBody.error;
    const parsed = parsedBody.data;

    const latitude = parsed.latitude ?? parsed.lat ?? null;
    const longitude = parsed.longitude ?? parsed.lng ?? null;
    if (latitude === null || longitude === null) return badRequest('Latitude and longitude are required');
    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return badRequest('Invalid coordinates');

    const cacheKey = `geocode:${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    try {
      const cached = parseCachedLocation(await redisUtils.get(cacheKey));
      if (cached) return respond(cached);
    } catch (error: unknown) {
      logger.warn('Reverse geocode cache read failed:', error);
    }

    if (env.GOOGLE_MAPS_API_KEY) {
      try {
        const googleResponse = await fetchWithTimeout(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${env.GOOGLE_MAPS_API_KEY}`,
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
      { message: 'Failed to get location details', error: env.NODE_ENV === 'development' ? message : undefined },
      500
    );
  }
}
