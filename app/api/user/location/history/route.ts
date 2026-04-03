// Phase 2: Updated location history mutations to validate CSRF against the authenticated session.
import { NextRequest } from 'next/server';

import { badRequest, parseBody, requireSession, respond, serverError } from '@/lib/api';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import { rateLimit } from '@/utils/rateLimiting';

import {
  VALID_ACTIONS,
  getLocationHistoryCached,
  invalidateUserLocationHistoryCaches,
  locationHistoryPostSchema,
  normalizeLocation,
  parseError,
  toTrimmedString,
  toNumber,
  typedStartUserLocationTracking,
  typedStopUserLocationTracking,
  typedUpdateUserLocation,
  validateLocationCoordinates,
  withUserIdHeader,
} from './helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) {
      return badRequest('Invalid user context');
    }
    return await getLocationHistoryCached(withUserIdHeader(request, userId), { userId });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Location history error:', err);
    return serverError('Failed to get location history');
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'location_update', 120, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return respond(
        { message: 'Too many location updates. Please try again later.' },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) {
      return badRequest('Invalid user context');
    }
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, locationHistoryPostSchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }

    const action = toTrimmedString(parsedBody.data.action);
    if (!action || !VALID_ACTIONS.has(action)) {
      return badRequest('Invalid action specified');
    }

    switch (action) {
      case 'update': {
        const location = normalizeLocation(parsedBody.data.location);
        if (!location) {
          return badRequest('Valid location payload is required');
        }

        const coords = validateLocationCoordinates(location);
        if (!coords) {
          return badRequest('Valid coordinates are required');
        }

        const normalizedLocation = {
          ...location,
          latitude: coords.latitude,
          longitude: coords.longitude,
          address: toTrimmedString(location.address) ?? undefined,
          city: toTrimmedString(location.city) ?? undefined,
          state: toTrimmedString(location.state) ?? undefined,
          accuracy: toNumber(location.accuracy) ?? undefined,
        };

        const updatedLocation = await typedUpdateUserLocation(userId, normalizedLocation);
        await invalidateUserLocationHistoryCaches(userId);

        return respond({
          success: true,
          message: 'Location updated successfully',
          data: {
            location: updatedLocation,
          },
        });
      }

      case 'start_tracking': {
        const location = normalizeLocation(parsedBody.data.location);
        await typedStartUserLocationTracking(userId, location ?? null);
        await invalidateUserLocationHistoryCaches(userId);

        return respond({
          success: true,
          message: 'Location tracking started',
        });
      }

      case 'stop_tracking':
        await typedStopUserLocationTracking(userId);
        await invalidateUserLocationHistoryCaches(userId);

        return respond({
          success: true,
          message: 'Location tracking stopped',
        });

      default:
        return badRequest('Invalid action specified');
    }
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Location update error:', err);
    return serverError('Failed to process location request');
  }
}
