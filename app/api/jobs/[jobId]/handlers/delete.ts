import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { requireSession } from '@/lib/api/auth';
import {
  badRequest,
  forbidden,
  noContent,
  notFound,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { invalidateJobReadCaches, toIdString } from '../job-route-utils';
import { getValidatedJobId, type JobRouteContext } from '../route.shared';

export async function DELETE(request: Request, segmentData: JobRouteContext) {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_delete', 5, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many delete requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    await connectDB();

    const user = await User.findById(userId);
    const job = await Job.findById(jobId);

    if (!user) return notFound('User');
    if (!job) return notFound('Job');

    const isAdmin = user.role === 'admin';
    const isJobCreator = toIdString(job.createdBy) === toIdString(user._id);

    if (!isAdmin && !isJobCreator) {
      return forbidden('Permission denied. Only job creator can delete this job.');
    }

    if (!['open', 'expired', 'cancelled'].includes(job.status)) {
      return badRequest('Jobs in progress or completed cannot be deleted');
    }

    await Job.findByIdAndDelete(jobId);
    await invalidateJobReadCaches(jobId);
    await publishToChannel(Channels.marketplace, Events.marketplace.jobClosed, {
      jobId,
      status: 'deleted',
      updatedAt: new Date().toISOString(),
    });

    return noContent();
  } catch (error) {
    logger.error('Delete job error:', error);
    return serverError('Failed to delete job');
  }
}
