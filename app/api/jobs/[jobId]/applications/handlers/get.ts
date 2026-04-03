import { requireSession } from '@/lib/api/auth';
import {
  forbidden,
  notFound,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { requirePermission } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

import { CACHE_HEADERS, getValidatedJobId, type JobRouteContext, withCacheControl } from '../../route.shared';

const JOB_APPLICATIONS_TTL = 30; // 30 seconds

import type { AuthorizedJob, JobWithApplications } from './applications.types';

export async function GET(request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'applications', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();

    try {
      requirePermission(session.user, 'read', 'application');
    } catch {
      return forbidden('Insufficient permissions');
    }

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    const cacheKey = `job:applications:v1:${jobId}`;
    const cached = await redisUtils.get<Record<string, unknown>>(cacheKey);
    if (cached !== null) {
      const response = respond(cached);
      return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
    }

    await connectDB();

    const authorizedJob = await Job.findById(jobId)
      .select('createdBy')
      .lean<AuthorizedJob | null>();
    if (!authorizedJob) return notFound('Job');
    if (String(authorizedJob.createdBy) !== userId) {
      return forbidden('Only job creator can view applications');
    }

    const jobWithApps = await Job.findById(jobId)
      .select('applications')
      .populate({
        path: 'applications.fixer',
        select: 'name username profilePhoto picture rating skills location',
        options: { lean: true },
      })
      .lean<JobWithApplications | null>();

    const responsePayload = {
      success: true,
      applications: jobWithApps?.applications ?? [],
    };
    await redisUtils.set(cacheKey, responsePayload, JOB_APPLICATIONS_TTL);
    const response = respond(responsePayload);
    return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
  } catch (error) {
    logger.error('Get applications error:', error);
    return serverError('Failed to fetch applications');
  }
}
