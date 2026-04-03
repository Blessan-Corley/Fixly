import { respond } from '@/lib/api';
import { isValidObjectId } from '@/lib/auth-utils';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { withServiceFallback } from '@/lib/resilience/serviceGuard';
import User from '@/models/User';

import {
  CACHE_TTL_SECONDS,
  NOT_FOUND_RESPONSE,
  buildAuthStatus,
  buildLookup,
  isInternalRequest,
  type CachedAuthStatus,
  type LeanAuthUser,
} from './helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  if (!isInternalRequest(request)) {
    return respond({ found: false, message: 'Unauthorized' }, 401);
  }

  const { searchParams } = new URL(request.url);
  const lookup = buildLookup(searchParams);
  if (!lookup) return respond({ found: false, message: 'Lookup parameters are required' }, 400);

  const cacheKey = isValidObjectId(lookup.id) ? `auth_status:${lookup.id}` : null;
  if (cacheKey) {
    const cached = await withServiceFallback(
      () => redisUtils.get<CachedAuthStatus>(cacheKey),
      null,
      'auth-status-cache-get'
    );
    if (cached && typeof cached === 'object' && cached !== null && typeof cached.found === 'boolean') {
      return respond(cached, 200, { headers: { 'Cache-Control': 'no-store' } });
    }
  }

  await connectDB();

  const userLookup: Array<Record<string, unknown>> = [];
  if (isValidObjectId(lookup.id)) userLookup.push({ _id: lookup.id });
  if (lookup.email) userLookup.push({ email: lookup.email });
  if (lookup.googleId) userLookup.push({ googleId: lookup.googleId });

  const user =
    userLookup.length > 0
      ? await User.findOne({ $or: userLookup })
          .select('role username isRegistered authMethod banned isActive deletedAt updatedAt')
          .lean<LeanAuthUser | null>()
      : null;

  if (!user) {
    if (cacheKey) {
      await withServiceFallback(
        () => redisUtils.set(cacheKey, { ...NOT_FOUND_RESPONSE, lastUpdated: Date.now() } satisfies CachedAuthStatus, CACHE_TTL_SECONDS),
        false,
        'auth-status-cache-set-miss'
      );
    }
    return respond(NOT_FOUND_RESPONSE, 200, { headers: { 'Cache-Control': 'no-store' } });
  }

  const status = buildAuthStatus(user);
  if (cacheKey && status.id) {
    await withServiceFallback(
      () => redisUtils.set(cacheKey, { ...status, lastUpdated: Date.now() } satisfies CachedAuthStatus, CACHE_TTL_SECONDS),
      false,
      'auth-status-cache-set'
    );
  }

  return respond(status, 200, { headers: { 'Cache-Control': 'no-store' } });
}
