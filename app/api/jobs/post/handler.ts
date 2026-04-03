// Phase 2: Updated job posting mutations to validate CSRF against the authenticated session.
import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import {
  badRequest,
  created,
  notFound,
  parseBody,
  requireSession,
  respond,
  serverError,
  unauthorized,
} from '@/lib/api';
import { createStandardError, requirePermission } from '@/lib/authorization';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { invalidateCache } from '@/lib/redisCache';
import { csrfGuard } from '@/lib/security/csrf';
import { createJob } from '@/lib/services/jobs/createJob';
import { mapListedJobs } from '@/lib/services/jobs/job.mapper';
import {
  getJobPostingCooldownError,
  prepareJobPostPayload,
} from '@/lib/services/jobs/job.mutations';
import { listJobsForUser, markExpiredJobsForUser } from '@/lib/services/jobs/job.queries';
import {
  asTrimmedString,
  getStatusFromParam,
  parseCreateJobBody,
  parsePositiveInt,
} from '@/lib/services/jobs/job.schema';
import { VALID_SORT_FIELDS, VALID_STATUSES } from '@/lib/services/jobs/job.types';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const CreateJobRequestSchema = z.object({}).passthrough();
const HIRER_JOBS_TTL = 60;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rateLimitResult = await rateLimit(request, 'job_posting');
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message:
            rateLimitResult.message || 'Too many job posting requests. Please try again later.',
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

    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return notFound('User');
    }

    try {
      requirePermission({ role: user.role }, 'create', 'job');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Only hirers can post jobs');
    }

    if (user.banned) {
      return respond({ message: 'Account suspended' }, 403);
    }

    const cooldownError = getJobPostingCooldownError(user);
    if (cooldownError) {
      return respond(cooldownError.body, cooldownError.status);
    }

    const parsed = await parseBody(request, CreateJobRequestSchema);
    if ('error' in parsed) return parsed.error;

    const body = parseCreateJobBody(parsed.data);
    if (!body) {
      return badRequest('Invalid request body');
    }

    const preparedPayload = await prepareJobPostPayload(body, { _id: String(user._id), plan: user.plan }, userId);
    if (preparedPayload.error) {
      return respond(preparedPayload.error.body, preparedPayload.error.status);
    }

    const job = await createJob(preparedPayload.jobData, String(user._id));
    const jobId = String(job._id);

    after(async () => {
      await Promise.allSettled([
        publishToChannel(Channels.marketplace, Events.marketplace.jobPosted, {
          jobId,
          title: job.title,
          category:
            typeof preparedPayload.jobData.category === 'string'
              ? preparedPayload.jobData.category
              : undefined,
          location: job.location,
          postedAt: job.createdAt,
        }),
        inngest.send({
          name: 'job/posted',
          data: {
            jobId,
            hirerId: session.user.id,
            hirerEmail: session.user.email ?? '',
            hirerName: session.user.name ?? 'Hirer',
            title: job.title ?? 'Untitled job',
            category:
              typeof preparedPayload.jobData.category === 'string'
                ? preparedPayload.jobData.category
                : '',
            location:
              typeof job.location === 'object' &&
              job.location !== null &&
              'city' in (job.location as Record<string, unknown>) &&
              typeof (job.location as Record<string, unknown>).city === 'string'
                ? ((job.location as Record<string, unknown>).city as string)
                : '',
            draftId: preparedPayload.draftId || undefined,
          },
        }),
        invalidateCache('/api/jobs/browse'),
        invalidateCache('/api/jobs/search'),
        redisUtils.invalidatePattern(`hirer-jobs:v1:${userId}:*`),
      ]);
    });

    const response = created({ jobId, message: 'Job posted successfully' });
    response.headers.set('X-Job-ID', jobId);
    response.headers.set('X-Job-Status', String(job.status || 'open'));
    response.headers.set('X-Job-Featured', String(Boolean(job.featured)));
    return response;
  } catch (error: unknown) {
    logger.error({ error }, 'Job posting error');
    return serverError('Failed to post job. Please try again.');
  }
}

export async function GET(request: Request): Promise<NextResponse> {
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
    if (!user) {
      return notFound('User');
    }

    try {
      requirePermission({ role: user.role }, 'update', 'job');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Only hirers can access this endpoint');
    }

    if (user.banned) {
      return respond({ message: 'Account suspended' }, 403);
    }

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
