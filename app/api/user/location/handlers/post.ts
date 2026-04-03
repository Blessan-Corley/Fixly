import { NextRequest } from 'next/server';

import { badRequest, parseBody, requireSession, serverError } from '@/lib/api';
import { respond } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';

import {
  getClientIp,
  invalidateUserLocationCaches,
  isValidCoordinatePair,
  normalizeLocationType,
  parseError,
  toNumber,
  toTrimmedString,
  typedUpdateCurrentLocation,
} from './location.helpers';
import { locationRequestSchema } from './location.types';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return badRequest('Invalid user context');

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const ip = getClientIp(request);
    const rateLimitResult = await redisRateLimit(`location_update:${ip}:${userId}`, 10, 60);
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message: 'Too many location updates. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime ?? Date.now() + 60000).toISOString(),
        },
        429
      );
    }

    const parsedBody = await parseBody(request, locationRequestSchema);
    if ('error' in parsedBody) return parsedBody.error;

    const lat = toNumber(parsedBody.data.lat);
    const lng = toNumber(parsedBody.data.lng);
    if (lat === null || lng === null) return badRequest('Valid latitude and longitude are required');
    if (!isValidCoordinatePair(lat, lng)) return badRequest('Invalid coordinate values');

    const address = toTrimmedString(parsedBody.data.address);
    const locationType = normalizeLocationType(parsedBody.data.locationType);

    const updatedLocation = await typedUpdateCurrentLocation(
      userId,
      lat,
      lng,
      address ?? null,
      locationType
    );

    await invalidateUserLocationCaches(userId);

    return respond({
      success: true,
      message: 'Location updated successfully',
      location: updatedLocation,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Location POST error:', err);
    if (err.message.includes('outside India bounds')) return badRequest('Location must be within India');
    return serverError('Failed to update location');
  }
}
