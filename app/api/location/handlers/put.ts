import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { respond, serverError, tooManyRequests, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import LocationPreference from '@/models/LocationPreference';
import { rateLimit } from '@/utils/rateLimiting';

import { clampInteger, invalidateLocationUserCache, toBooleanOrNull, toTrimmedString } from './location.helpers';
import { LocationPreferencesPayloadSchema, type LocationDocument } from './location.types';

export async function PUT(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(
      request,
      'location_preferences_update',
      40,
      60 * 60 * 1000
    );
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return unauthorized('Unauthorized');

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, LocationPreferencesPayloadSchema);
    if ('error' in parsed) return parsed.error;

    await connectDB();

    let locationPrefs = (await LocationPreference.findOne({ user: userId })) as LocationDocument | null;
    if (!locationPrefs) {
      locationPrefs = new LocationPreference({ user: userId }) as LocationDocument;
    }

    const maxTravelDistance = clampInteger(parsed.data.maxTravelDistance, 1, 100);
    const autoLocationEnabled = toBooleanOrNull(parsed.data.autoLocationEnabled);
    const locationSharingConsent = toBooleanOrNull(parsed.data.locationSharingConsent);
    const shareExactLocation = toBooleanOrNull(parsed.data.shareExactLocation);
    const shareApproximateLocation = toBooleanOrNull(parsed.data.shareApproximateLocation);
    const trackLocationHistory = toBooleanOrNull(parsed.data.trackLocationHistory);

    if (maxTravelDistance !== null) locationPrefs.preferences.maxTravelDistance = maxTravelDistance;
    if (autoLocationEnabled !== null) locationPrefs.preferences.autoLocationEnabled = autoLocationEnabled;

    if (locationSharingConsent !== null) {
      locationPrefs.preferences.locationSharingConsent = locationSharingConsent;
      if (!locationSharingConsent) {
        locationPrefs.currentLocation = {};
        locationPrefs.locationHistory = [];
      }
    }

    if (shareExactLocation !== null) {
      locationPrefs.privacy.shareExactLocation = shareExactLocation;
      if (shareExactLocation) locationPrefs.privacy.shareApproximateLocation = true;
    }

    if (shareApproximateLocation !== null) {
      locationPrefs.privacy.shareApproximateLocation = shareApproximateLocation;
      if (!shareApproximateLocation) locationPrefs.privacy.shareExactLocation = false;
    }

    if (trackLocationHistory !== null) {
      locationPrefs.privacy.trackLocationHistory = trackLocationHistory;
      if (!trackLocationHistory) locationPrefs.locationHistory = [];
    }

    await locationPrefs.save();
    await invalidateLocationUserCache(userId);

    return respond({
      success: true,
      message: 'Location preferences updated successfully',
      data: {
        preferences: locationPrefs.preferences,
        privacy: locationPrefs.privacy,
      },
    });
  } catch (error: unknown) {
    logger.error('Error updating location preferences:', error);
    return serverError('Failed to update location preferences');
  }
}
