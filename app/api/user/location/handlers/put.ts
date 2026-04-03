import { NextRequest } from 'next/server';

import { badRequest, parseBody, requireSession, serverError } from '@/lib/api';
import { respond } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { redisRateLimit } from '@/lib/redis';

import {
  getClientIp,
  invalidateUserLocationCaches,
  normalizeHomeAddress,
  parseError,
  toTrimmedString,
  typedSetHomeAddress,
} from './location.helpers';
import { homeAddressRequestSchema } from './location.types';

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return badRequest('Invalid user context');

    const ip = getClientIp(request);
    const rateLimitResult = await redisRateLimit(`home_address:${ip}:${userId}`, 5, 3600);
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message: 'Too many home address updates. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime ?? Date.now() + 3600000).toISOString(),
        },
        429
      );
    }

    const parsedBody = await parseBody(request, homeAddressRequestSchema);
    if ('error' in parsedBody) return parsedBody.error;

    const normalizedAddress = normalizeHomeAddress(parsedBody.data);
    if (!normalizedAddress) {
      return respond(
        { success: false, message: 'All address fields are required and postal code must be valid' },
        400
      );
    }

    const homeAddress = await typedSetHomeAddress(userId, normalizedAddress);
    await invalidateUserLocationCaches(userId);

    return respond({
      success: true,
      message: 'Home address saved successfully',
      homeAddress,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Home address PUT error:', err);
    if (err.message.includes('outside India bounds')) return badRequest('Home address must be within India');
    return serverError('Failed to save home address');
  }
}
