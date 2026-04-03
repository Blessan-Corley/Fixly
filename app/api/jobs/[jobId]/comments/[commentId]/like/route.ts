import { EVENTS } from '@/lib/ably';
import { getOptionalSession, requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { badRequest, notFound, respond, tooManyRequests, unauthorized } from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { getValidatedJobId, isValidObjectId } from '../../../route.shared';
import { invalidateJobCommentCaches, publishCommentChannelEvent, toIdString, type CommentRouteContext } from '../shared';

import {
  CommentLikeParamsSchema,
  LikeBodySchema,
  resolveLikeTarget,
  sendLikeNotification,
  type CommentEntry,
  type JobCommentsProjection,
  type JobWithLikeActions,
} from './helpers';

export const dynamic = 'force-dynamic';

type RouteContext = CommentRouteContext;

export async function POST(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const rateLimitResult = await rateLimit(request, 'comment_likes', 500, 60 * 60 * 1000);
    if (!rateLimitResult.success) return tooManyRequests('Too many like actions. Please try again later.');

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    if (!session.user.id) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;

    const parsedParams = CommentLikeParamsSchema.safeParse({
      jobId: jobIdResult.jobId,
      commentId: params?.commentId,
    });
    if (!parsedParams.success) return badRequest('Validation failed', parsedParams.error.flatten());
    const { jobId, commentId } = parsedParams.data;

    if (!isValidObjectId(commentId)) return badRequest('Invalid comment ID');

    const parsedBody = await parseBody(request, LikeBodySchema);
    const body = 'data' in parsedBody ? parsedBody.data : {};
    const replyId = typeof body.replyId === 'string' ? body.replyId.trim() : '';
    if (replyId && !isValidObjectId(replyId)) return badRequest('Invalid reply ID');

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) return notFound('User');
    if (user.banned) return respond({ message: 'Account suspended' }, 403);

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    const likeableJob = job as unknown as JobWithLikeActions;
    const target = resolveLikeTarget(likeableJob, commentId, replyId, user._id);
    if (!target) return notFound(replyId ? 'Reply' : 'Comment');

    const { result, targetAuthor, likes } = target;
    await likeableJob.save();
    await invalidateJobCommentCaches(jobId);

    if (result?.liked) {
      await sendLikeNotification(targetAuthor, user._id, user.name, jobId, commentId);
    }

    await publishCommentChannelEvent(jobId, EVENTS.COMMENT_LIKED, {
      commentId, replyId: replyId || null, jobId, userId: user._id, userName: user.name,
      liked: !!result?.liked, likeCount: Number(result?.likeCount ?? 0), likes,
      type: replyId ? 'reply' : 'comment',
      timestamp: new Date().toISOString(),
    });

    const action = replyId ? 'Reply' : 'Comment';
    return respond({
      success: true,
      message: result?.liked ? `${action} liked successfully` : `${action} unliked successfully`,
      liked: !!result?.liked,
      likeCount: Number(result?.likeCount ?? 0),
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Comment like error:', err);
    return respond(
      { message: 'Failed to process like action', error: env.NODE_ENV === 'development' ? err.message : undefined },
      500
    );
  }
}

export async function GET(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const session = await getOptionalSession();
    const userId = session?.user?.id ?? '';

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;

    const parsedParams = CommentLikeParamsSchema.safeParse({
      jobId: jobIdResult.jobId,
      commentId: params?.commentId,
    });
    if (!parsedParams.success) return badRequest('Validation failed', parsedParams.error.flatten());
    const { jobId, commentId } = parsedParams.data;
    const replyId = new URL(request.url).searchParams.get('replyId') ?? '';

    if (!isValidObjectId(commentId)) return badRequest('Invalid comment ID');
    if (replyId && !isValidObjectId(replyId)) return badRequest('Invalid reply ID');

    await connectDB();

    const job = await Job.findById(jobId)
      .select('comments')
      .populate({ path: 'comments.likes.user', select: 'name username photoURL' })
      .populate({ path: 'comments.replies.likes.user', select: 'name username photoURL' })
      .lean<JobCommentsProjection | null>();

    if (!job) return notFound('Job');

    const comment = (job.comments ?? []).find((entry: CommentEntry) => String(entry?._id) === commentId);
    if (!comment) return notFound('Comment');

    let likes = Array.isArray(comment.likes) ? comment.likes : [];
    if (replyId) {
      const reply = (comment.replies ?? []).find((entry) => String(entry?._id) === replyId);
      if (!reply) return notFound('Reply');
      likes = Array.isArray(reply.likes) ? reply.likes : [];
    }

    return respond({
      success: true,
      likeCount: likes.length,
      liked: !!userId && likes.some((entry) => toIdString(entry?.user) === userId),
      likes,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get comment likes error:', err);
    return respond(
      { message: 'Failed to fetch comment likes', error: env.NODE_ENV === 'development' ? err.message : undefined },
      500
    );
  }
}
