import { requireSession } from '@/lib/api/auth';
import { respond, serverError, tooManyRequests, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import LocationPreference from '@/models/LocationPreference';
import { rateLimit } from '@/utils/rateLimiting';

import { invalidateLocationUserCache, toTrimmedString } from './location.helpers';
import type { LocationDocument } from './location.types';

export async function DELETE(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'location_clear', 20, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return unauthorized('Unauthorized');

    await connectDB();

    const locationPrefs = (await LocationPreference.findOne({
      user: userId,
    })) as LocationDocument | null;

    if (locationPrefs) {
      locationPrefs.currentLocation = {};
      locationPrefs.locationHistory = [];
      locationPrefs.preferences.locationSharingConsent = false;
      locationPrefs.preferences.autoLocationEnabled = false;
      await locationPrefs.save();
    }

    await invalidateLocationUserCache(userId);

    return respond({ success: true, message: 'Location data cleared successfully' });
  } catch (error: unknown) {
    logger.error('Error clearing location data:', error);
    return serverError('Failed to clear location data');
  }
}
