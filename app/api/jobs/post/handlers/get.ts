import {
  badRequest,
  notFound,
  requireSession,
  respond,
  serverError,
  unauthorized,
} from '@/lib/api';
import { createStandardError, requirePermission } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { mapListedJobs } from '@/lib/services/jobs/job.mapper';
import { listJobsForUser, markExpiredJobsForUser } from '@/lib/services/jobs/job.queries';
import {
  asTrimmedString,
  getStatusFromParam,
  parsePositiveInt,
} from '@/lib/services/jobs/job.schema';
import { VALID_SORT_FIELDS, VALID_STATUSES } from '@/lib/services/jobs/job.types';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

const HIRER_JOBS_TTL = 60;

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'api_requests');
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message: rateLimitResult.message || 'Too many requests. Please try again later.',
          remainingTime: rateLimitResult.remainingTime,
        },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const session = auth.session;
    const userId = typeof session.user.id === 'string' ? session.user.id : '';
    if (!userId) return unauthorized();

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    try {
      requirePermission({ role: user.role }, 'update', 'job');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Only hirers can access this endpoint');
    }

    if (user.banned) return respond({ message: 'Account suspended' }, 403);

    const searchParams = new URL(request.url).searchParams;
    const page = parsePositiveInt(searchParams.get('page'), 1, 1);
    const limit = parsePositiveInt(searchParams.get('limit'), 10, 1, 50);
    const rawStatus = asTrimmedString(searchParams.get('status')).toLowerCase();
    const sortByParam = asTrimmedString(searchParams.get('sortBy')) || 'createdAt';
    const sortOrderParam = asTrimmedString(searchParams.get('sortOrder')).toLowerCase();

    const statusFilter = rawStatus ? getStatusFromParam(rawStatus) : null;
    if (rawStatus && !statusFilter) {
      return badRequest(`Invalid status parameter. Valid options: ${VALID_STATUSES.join(', ')}`);
    }

    const sortBy = VALID_SORT_FIELDS.has(sortByParam) ? sortByParam : 'createdAt';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const skip = (page - 1) * limit;
    const hirerJobsCacheKey =
      statusFilter !== 'expired'
        ? `hirer-jobs:v1:${userId}:${page}:${limit}:${statusFilter ?? 'all'}:${sortBy}:${sortOrder}`
        : null;

    if (hirerJobsCacheKey !== null) {
      const cachedJobs = await redisUtils.get<{
        success: boolean;
        pagination: { total: number; totalPages: number };
      }>(hirerJobsCacheKey);
      if (cachedJobs != null) {
        return respond(cachedJobs, 200, {
          headers: {
            'X-Total-Count': String(cachedJobs.pagination.total),
            'X-Page-Count': String(cachedJobs.pagination.totalPages),
          },
        });
      }
    }

    if (statusFilter === 'expired') {
      await markExpiredJobsForUser(String(user._id));
    }

    try {
      const { jobs, total } = await listJobsForUser({
        userId: String(user._id),
        statusFilter,
        sort,
        skip,
        limit,
      });

      const jobsWithCounts = mapListedJobs(jobs);
      const responsePayload = {
        success: true,
        jobs: jobsWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + jobs.length < total,
        },
        filters: {
          status: statusFilter || '',
          sortBy,
          sortOrder,
        },
      };

      if (hirerJobsCacheKey !== null) {
        await redisUtils.set(hirerJobsCacheKey, responsePayload, HIRER_JOBS_TTL);
      }

      return respond(responsePayload, 200, {
        headers: {
          'X-Total-Count': String(total),
          'X-Page-Count': String(Math.ceil(total / limit)),
        },
      });
    } catch (queryError: unknown) {
      logger.error({ error: queryError }, 'Database query error');
      return serverError('Database query failed. Please try again.');
    }
  } catch (error: unknown) {
    logger.error({ error }, 'Get jobs error');
    return serverError('Failed to fetch jobs');
  }
}
