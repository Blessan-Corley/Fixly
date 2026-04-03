import { requireSession } from '@/lib/api/auth';
import { serverError, tooManyRequests, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/utils/rateLimiting';

import { getLocationCached, toTrimmedString, withUserIdHeader } from './location.helpers';

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'location_get', 80, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return unauthorized('Unauthorized');

    return await getLocationCached(withUserIdHeader(request, userId), { userId });
  } catch (error: unknown) {
    logger.error('Error fetching location preferences:', error);
    return serverError('Failed to fetch location preferences');
  }
}
