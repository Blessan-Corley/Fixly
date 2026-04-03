import { NextRequest } from 'next/server';

import { badRequest, requireSession, serverError } from '@/lib/api';
import { respond } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { redisRateLimit } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';

import {
  getClientIp,
  getUserLocationCached,
  parseError,
  toTrimmedString,
  withUserIdHeader,
} from './location.helpers';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return badRequest('Invalid user context');

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const ip = getClientIp(request);
    const rateLimitResult = await redisRateLimit(`location_get:${ip}:${userId}`, 30, 60);
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message: 'Too many location requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime ?? Date.now() + 60000).toISOString(),
        },
        429
      );
    }

    return await getUserLocationCached(withUserIdHeader(request, userId), { userId });
  } catch (error: unknown) {
    logger.error('Location GET error:', parseError(error));
    return serverError('Failed to retrieve location data');
  }
}
