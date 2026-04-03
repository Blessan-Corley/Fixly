import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { badRequest, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import LocationPreference from '@/models/LocationPreference';
import { rateLimit } from '@/utils/rateLimiting';

import { invalidateLocationUserCache, toTrimmedString } from './location.helpers';
import { LocationPayloadSchema, type LocationDocument } from './location.types';

export async function POST(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'location_update', 20, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Rate limit exceeded. Too many location updates.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return unauthorized('Unauthorized');

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, LocationPayloadSchema);
    if ('error' in parsed) return parsed.error;

    const { lat, lng, consent } = parsed.data;
    const accuracy = parsed.data.accuracy ?? null;
    const address = toTrimmedString(parsed.data.address);
    const city = toTrimmedString(parsed.data.city);
    const state = toTrimmedString(parsed.data.state);
    const pincode = toTrimmedString(parsed.data.pincode);

    if (consent !== true) return badRequest('Location sharing consent is required');

    await connectDB();

    let locationPrefs = (await LocationPreference.findOne({ user: userId })) as LocationDocument | null;
    if (!locationPrefs) {
      locationPrefs = new LocationPreference({
        user: userId,
        preferences: {
          maxTravelDistance: 25,
          autoLocationEnabled: true,
          locationSharingConsent: true,
        },
        privacy: {
          shareExactLocation: false,
          shareApproximateLocation: true,
          trackLocationHistory: false,
        },
      }) as LocationDocument;
    }

    locationPrefs.preferences.locationSharingConsent = true;
    locationPrefs.preferences.autoLocationEnabled = true;

    await locationPrefs.updateLocation({
      lat,
      lng,
      accuracy: accuracy === null ? undefined : accuracy,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      pincode: pincode || undefined,
      source: 'gps',
    });

    await invalidateLocationUserCache(userId);

    return respond({
      success: true,
      message: 'Location updated successfully',
      data: {
        hasLocation: true,
        lastUpdated: locationPrefs.lastLocationUpdate,
        city: locationPrefs.currentLocation?.city,
        state: locationPrefs.currentLocation?.state,
      },
    });
  } catch (error: unknown) {
    logger.error('Error updating location:', error);
    return serverError('Failed to update location');
  }
}
