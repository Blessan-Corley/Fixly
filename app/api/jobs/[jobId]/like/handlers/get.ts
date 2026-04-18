import { badRequest, getOptionalSession, notFound, respond } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';

import { getValidatedJobId, type JobRouteContext } from '../../route.shared';
import { JobLikeParamsSchema, toIdString, type JobLikesProjection } from '../like.helpers';

export async function GET(_request: Request, props: JobRouteContext): Promise<Response> {
  const params = await props.params;
  try {
    const session = await getOptionalSession();
    const viewerId = typeof session?.user?.id === 'string' ? session.user.id : undefined;

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

    const job = await Job.findById(jobId)
      .select('likes')
      .populate('likes.user', 'name username photoURL')
      .lean<JobLikesProjection | null>();

    if (!job) return notFound('Job');

    const likes = Array.isArray(job.likes) ? job.likes : [];
    const likeCount = likes.length;
    const liked = !!viewerId && likes.some((entry) => toIdString(entry?.user) === viewerId);

    return respond({ success: true, likeCount, liked, likes });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get job likes error:', err);
    return respond(
      {
        message: 'Failed to fetch job likes',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
