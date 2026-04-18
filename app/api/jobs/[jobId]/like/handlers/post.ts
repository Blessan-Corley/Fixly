import {
  badRequest,
  notFound,
  requireSession,
  respond,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { getValidatedJobId, type JobRouteContext } from '../../route.shared';
import { JobLikeParamsSchema, toIdString, type JobWithLikeActions } from '../like.helpers';

export async function POST(request: Request, props: JobRouteContext): Promise<Response> {
  const params = await props.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_likes', 100, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many like actions. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }
    const parsedParams = JobLikeParamsSchema.safeParse({ jobId: jobIdResult.jobId });
    if (!parsedParams.success) {
      return badRequest('Validation failed', parsedParams.error.flatten().fieldErrors);
    }
    const { jobId } = parsedParams.data;

    await connectDB();

    const user = await User.findById(userId).select('name banned');
    if (!user) return notFound('User');
    if (user.banned) return respond({ message: 'Account suspended' }, 403);

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    if (toIdString(job.createdBy) === toIdString(user._id)) {
      return badRequest('You cannot like your own job');
    }

    const likeableJob = job as JobWithLikeActions;
    const result = likeableJob.toggleLike(user._id);
    await likeableJob.save();

    if (result?.liked) {
      try {
        const jobCreator = await User.findById(job.createdBy);
        if (jobCreator) {
          await jobCreator.addNotification(
            'job_liked',
            'Job Liked',
            `${user.name} liked your job "${job.title}".`,
            { jobId: job._id, fromUser: user._id }
          );
        }
      } catch (error) {
        logger.error('Failed to send job-like notification:', error);
      }
    }

    return respond({
      success: true,
      message: result?.liked ? 'Job liked successfully' : 'Job unliked successfully',
      liked: !!result?.liked,
      likeCount: Number(result?.likeCount || 0),
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Like job error:', err);
    return respond(
      {
        message: 'Failed to process like action',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
