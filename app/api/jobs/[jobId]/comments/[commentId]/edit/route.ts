import { EVENTS } from '@/lib/ably';
import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { badRequest, notFound, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api/response';
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
  EditBodySchema,
  normalizeMentions,
  runMessageModeration,
  sanitizeMessage,
  sendMentionNotifications,
  type CommentEntry,
  type JobCommentsProjection,
  type JobEditActions,
} from './helpers';

export const dynamic = 'force-dynamic';

type RouteContext = CommentRouteContext;

export async function PUT(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const rateLimitResult = await rateLimit(request, 'comment_edits', 50, 60 * 60 * 1000);
    if (!rateLimitResult.success) return tooManyRequests('Too many edit actions. Please try again later.');

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

    const parsedBody = await parseBody(request, EditBodySchema);
    if ('error' in parsedBody) return parsedBody.error;
    const body = parsedBody.data;

    const message = sanitizeMessage(body.message);
    const replyId = typeof body.replyId === 'string' ? body.replyId.trim() : '';
    const mentions = normalizeMentions(body.mentions);

    if (!message) return badRequest('Message content is required');
    if (message.length > 500) return badRequest('Message cannot exceed 500 characters');
    if (replyId && !isValidObjectId(replyId)) return badRequest('Invalid reply ID');

    const moderation = await runMessageModeration(message, replyId, mentions, session.user.id);
    if (!moderation.allowed) {
      return respond({ message: moderation.message, violations: moderation.violations, type: 'sensitive_content' }, 400);
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) return notFound('User');
    if (user.banned) return respond({ message: 'Account suspended' }, 403);

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    const editableJob = job as unknown as JobEditActions;
    const result = replyId
      ? editableJob.editReply(commentId, replyId, user._id, moderation.content, mentions)
      : editableJob.editComment(commentId, user._id, moderation.content, mentions);

    if (!result?.success) {
      const statusCode =
        typeof result?.message === 'string' && result.message.toLowerCase().includes('not found') ? 404 : 403;
      return respond({ message: result?.message || 'Failed to edit content' }, statusCode);
    }

    await job.save();
    await invalidateJobCommentCaches(jobId);
    await job.populate({ path: 'comments.author', select: 'name username photoURL role' });
    if (replyId) await job.populate({ path: 'comments.replies.author', select: 'name username photoURL role' });

    if (mentions.length > 0) {
      await sendMentionNotifications(mentions, String(user._id), user.name, jobId, commentId);
    }

    await publishCommentChannelEvent(jobId, EVENTS.COMMENT_EDITED, {
      commentId, replyId: replyId || null, jobId, userId: user._id, userName: user.name,
      editedContent: moderation.content, mentions, type: replyId ? 'reply' : 'comment',
      timestamp: new Date().toISOString(),
    });

    return respond({
      success: true,
      message: result.message,
      [replyId ? 'reply' : 'comment']: result[replyId ? 'reply' : 'comment'],
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Edit comment error:', err);
    return respond(
      { message: 'Failed to edit content', error: env.NODE_ENV === 'development' ? err.message : undefined },
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

    const job = await Job.findById(jobId).select('comments').lean<JobCommentsProjection | null>();
    if (!job) return notFound('Job');

    const comment = (job.comments ?? []).find((entry: CommentEntry) => String(entry?._id) === commentId);
    if (!comment) return notFound('Comment');

    if (replyId) {
      const reply = (comment.replies ?? []).find((entry) => String(entry?._id) === replyId);
      if (!reply) return notFound('Reply');
      const history = reply.edited ?? { isEdited: false, editHistory: [] };
      return respond({ success: true, isEdited: !!history.isEdited, editedAt: history.editedAt, editHistory: history.editHistory ?? [] });
    }

    const history = comment.edited ?? { isEdited: false, editHistory: [] };
    return respond({ success: true, isEdited: !!history.isEdited, editedAt: history.editedAt, editHistory: history.editHistory ?? [] });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get edit history error:', err);
    return serverError(env.NODE_ENV === 'development' ? err.message : 'Failed to fetch edit history');
  }
}
