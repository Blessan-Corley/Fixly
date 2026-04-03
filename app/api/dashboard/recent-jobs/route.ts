import { requireSession } from '@/lib/api/auth';
import { badRequest, forbidden, notFound, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asRole,
  getAssignedUserId,
  parseCachedRecentJobs,
  parseLimit,
  toTimestamp,
  toTrimmedString,
  type CachedRecentJobs,
  type JobApplication,
  type JobRecord,
  type RecentJobsResponse,
  type SessionUser,
  type UserRecord,
} from './helpers';

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
    if (!user) {
      return notFound('User');
    }
    if ((user as unknown as { banned?: boolean }).banned) {
      return forbidden('Account suspended');
    }
    if ((user as unknown as { isActive?: boolean }).isActive === false) {
      return forbidden('Account is inactive');
    }

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
        {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': `max-age=${cacheTTL}`,
          },
        }
      );
    }

    let jobs: JobRecord[] = [];

    if (role === 'hirer') {
      const hirerJobs = (await Job.find({ createdBy: user._id })
        .populate('assignedTo', 'name username profilePhoto picture rating')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()) as JobRecord[];

      jobs = hirerJobs.map((job) => {
        const { applications, ...rest } = job;
        return {
          ...rest,
          applicationCount: Array.isArray(applications) ? applications.length : 0,
        };
      });
    }

    if (role === 'fixer') {
      const fixerJobs = (await Job.find({
        $or: [{ 'applications.fixer': user._id }, { assignedTo: user._id }],
      })
        .populate('createdBy', 'name username profilePhoto picture rating location')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean()) as JobRecord[];

      const transformed = fixerJobs.map((job) => {
        const applications = Array.isArray(job.applications) ? job.applications : [];
        const userApplication = (applications as JobApplication[]).find(
          (application) => String(application.fixer) === String(user._id)
        );
        const assignedUserId = getAssignedUserId(job.assignedTo);
        const isAssigned = assignedUserId === String(user._id);
        const { applications: _, ...rest } = job;

        return {
          ...rest,
          applicationStatus: userApplication?.status || (isAssigned ? 'assigned' : 'pending'),
          appliedAt: userApplication?.appliedAt,
          proposedAmount: userApplication?.proposedAmount,
          activityAt: userApplication?.appliedAt || job.updatedAt || job.createdAt,
        };
      });

      transformed.sort(
        (a, b) =>
          toTimestamp(b.activityAt as string | Date) - toTimestamp(a.activityAt as string | Date)
      );
      jobs = transformed.slice(0, limit);
    }

    if (role === 'admin') {
      const adminJobs = (await Job.find({})
        .populate('createdBy', 'name username profilePhoto picture')
        .populate('assignedTo', 'name username profilePhoto picture')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()) as JobRecord[];

      jobs = adminJobs.map((job) => {
        const { applications, ...rest } = job;
        return {
          ...rest,
          applicationCount: Array.isArray(applications) ? applications.length : 0,
        };
      });
    }

    const payload: RecentJobsResponse = {
      success: true,
      jobs,
      total: jobs.length,
      role,
    };

    await redisUtils.set(
      cacheKey,
      {
        ...payload,
        _cacheTimestamp: new Date().toISOString(),
      } satisfies CachedRecentJobs,
      cacheTTL
    );

    return respond(payload, 200, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `max-age=${cacheTTL}`,
      },
    });
  } catch (error: unknown) {
    logger.error('Recent jobs error:', error);
    return serverError('Failed to fetch recent jobs');
  }
}
