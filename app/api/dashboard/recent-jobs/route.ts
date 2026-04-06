import { requireSession } from '@/lib/api/auth';
import { badRequest, forbidden, notFound, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asRole,
  parseLimit,
  parseCachedRecentJobs,
  toTrimmedString,
  type CachedRecentJobs,
  type RecentJobsResponse,
  type SessionUser,
  type UserRecord,
} from './helpers';
import { fetchAdminJobs, fetchFixerJobs, fetchHirerJobs } from './recent-jobs.queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'recent_jobs', 60, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return unauthorized();
    }

    const session = auth.session as { user?: SessionUser };
    const userId = toTrimmedString(session.user?.id);
    if (!userId) {
      return unauthorized();
    }

    await connectDB();

    const user = (await User.findById(userId)
      .select('_id role banned isActive')
      .lean()) as UserRecord | null;
    if (!user) return notFound('User');
    if ((user as unknown as { banned?: boolean }).banned) return forbidden('Account suspended');
    if ((user as unknown as { isActive?: boolean }).isActive === false) return forbidden('Account is inactive');

    const role = asRole(user.role);
    if (!role) {
      return badRequest('User role not set. Please complete your profile.');
    }

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'));
    const cacheKey = `dashboard:recent-jobs:${role}:${String(user._id)}:${limit}`;
    const cacheTTL = 60;

    const cachedJobs = parseCachedRecentJobs(await redisUtils.get(cacheKey));
    if (cachedJobs) {
      return respond(
        {
          success: true,
          jobs: cachedJobs.jobs,
          total: cachedJobs.total,
          role: cachedJobs.role,
          cached: true,
          cacheTimestamp: cachedJobs._cacheTimestamp,
        } satisfies RecentJobsResponse,
        200,
        { headers: { 'X-Cache': 'HIT', 'Cache-Control': `max-age=${cacheTTL}` } }
      );
    }

    const jobs =
      role === 'hirer'
        ? await fetchHirerJobs(user._id, limit)
        : role === 'fixer'
          ? await fetchFixerJobs(user._id, limit)
          : await fetchAdminJobs(limit);

    const payload: RecentJobsResponse = { success: true, jobs, total: jobs.length, role };

    await redisUtils.set(
      cacheKey,
      { ...payload, _cacheTimestamp: new Date().toISOString() } satisfies CachedRecentJobs,
      cacheTTL
    );

    return respond(payload, 200, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': `max-age=${cacheTTL}` },
    });
  } catch (error: unknown) {
    logger.error('Recent jobs error:', error);
    return serverError('Failed to fetch recent jobs');
  }
}
