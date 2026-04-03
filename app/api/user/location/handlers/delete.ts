import { NextRequest } from 'next/server';

import { badRequest, parseQuery, requireSession, serverError } from '@/lib/api';
import { respond } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';

import { invalidateUserLocationCaches, parseError, toTrimmedString } from './location.helpers';
import { locationQuerySchema } from './location.types';

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) return badRequest('Invalid user context');

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedQuery = parseQuery(request, locationQuerySchema);
    if ('error' in parsedQuery) return parsedQuery.error;

    const dataType = parsedQuery.data.type ?? 'current';
    await invalidateUserLocationCaches(userId);

    return respond({
      success: true,
      message: `Location data cleared: ${dataType}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error('Location DELETE error:', parseError(error));
    return serverError('Failed to clear location data');
  }
}
