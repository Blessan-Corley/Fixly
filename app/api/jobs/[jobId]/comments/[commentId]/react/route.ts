import { EVENTS } from '@/lib/ably';
import { requireSession } from '@/lib/api/auth';
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
import { invalidateJobCommentCaches, publishCommentChannelEvent, type CommentRouteContext } from '../shared';

import {
  ALLOWED_REACTIONS,
  CommentReactionSchema,
  buildReactionCounts,
  resolveReactionTarget,
  sendReactionNotification,
  type CommentEntry,
  type JobCommentsProjection,
  type JobWithReactionActions,
} from './helpers';

export const dynamic = 'force-dynamic';

type RouteContext = CommentRouteContext;

export async function POST(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const rateLimitResult = await rateLimit(request, 'comment_reactions', 300, 60 * 60 * 1000);
    if (!rateLimitResult.success) return tooManyRequests('Too many reaction actions. Please try again later.');

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    if (!session.user.id) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;
    const commentId = params?.commentId;

    if (!commentId) return badRequest('Comment ID is required');
    if (!isValidObjectId(commentId)) return badRequest('Invalid comment ID');

    const parsedBody = await parseBody(request, CommentReactionSchema);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data;

    const reactionSource =
      typeof body.reactionType === 'string'
        ? body.reactionType
        : typeof body.emoji === 'string'
          ? body.emoji
          : '';
    const reactionType = reactionSource.trim().toLowerCase();
    const replyId = typeof body.replyId === 'string' ? body.replyId.trim() : '';

    if (!ALLOWED_REACTIONS.has(reactionType)) return badRequest('Valid reaction type is required');
    if (replyId && !isValidObjectId(replyId)) return badRequest('Invalid reply ID');

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) return notFound('User');
    if (user.banned) return respond({ message: 'Account suspended' }, 403);

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    const reactableJob = job as unknown as JobWithReactionActions;
    const target = resolveReactionTarget(reactableJob, commentId, replyId, user._id, reactionType);
    if (!target) return notFound(replyId ? 'Reply' : 'Comment');

    const { result, targetAuthor, reactions } = target;
    await reactableJob.save();
    await invalidateJobCommentCaches(jobId);

    if (result?.reacted) {
      await sendReactionNotification(targetAuthor, user._id, user.name, jobId, commentId);
    }

    await publishCommentChannelEvent(jobId, EVENTS.COMMENT_REACTED, {
      commentId, replyId: replyId || null, jobId, userId: user._id, userName: user.name,
      reacted: !!result?.reacted, reactionType: result?.reactionType ?? null,
      reactionCount: Number(result?.count ?? 0), reactions,
      reactionCounts: buildReactionCounts(reactions),
      type: replyId ? 'reply' : 'comment',
      timestamp: new Date().toISOString(),
    });

    return respond({
      success: true,
      message: result?.reacted ? `Reacted with ${result.reactionType}` : 'Reaction removed',
      reacted: !!result?.reacted,
      reactionType: result?.reactionType ?? null,
      reactionCount: Number(result?.count ?? 0),
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Comment reaction error:', err);
    return respond(
      { message: 'Failed to process reaction', error: env.NODE_ENV === 'development' ? err.message : undefined },
      500
    );
  }
}

export async function GET(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;
    const commentId = params?.commentId;
    const replyId = new URL(request.url).searchParams.get('replyId') ?? '';

    if (!commentId) return badRequest('Comment ID is required');
    if (!isValidObjectId(commentId)) return badRequest('Invalid comment ID');
    if (replyId && !isValidObjectId(replyId)) return badRequest('Invalid reply ID');

    await connectDB();

    const job = await Job.findById(jobId)
      .select('comments')
      .populate({ path: 'comments.reactions.user', select: 'name username photoURL' })
      .populate({ path: 'comments.replies.reactions.user', select: 'name username photoURL' })
      .lean<JobCommentsProjection | null>();

    if (!job) return notFound('Job');

    const comment = (job.comments ?? []).find((entry: CommentEntry) => String(entry?._id) === commentId);
    if (!comment) return notFound('Comment');

    let reactions = Array.isArray(comment.reactions) ? comment.reactions : [];
    if (replyId) {
      const reply = (comment.replies ?? []).find((entry) => String(entry?._id) === replyId);
      if (!reply) return notFound('Reply');
      reactions = Array.isArray(reply.reactions) ? reply.reactions : [];
    }

    return respond({
      success: true,
      reactions,
      reactionCounts: buildReactionCounts(reactions),
      totalReactions: reactions.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get comment reactions error:', err);
    return respond(
      { message: 'Failed to fetch reactions', error: env.NODE_ENV === 'development' ? err.message : undefined },
      500
    );
  }
}
