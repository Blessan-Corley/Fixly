import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { notFound, respond, unauthorized , badRequest } from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import User from '@/models/User';

import { publishJobCountsUpdate } from '../../realtime';
import { getValidatedJobId, isValidObjectId, type JobRouteContext } from '../../route.shared';

import {
  EVENTS,
  deleteBodySchema,
  invalidateJobCommentCaches,
  publishCommentEvent,
  type DeleteBody,
  type JobCommentActions,
} from './shared';

export async function DELETE(request: Request, segmentData: JobRouteContext) {
  const params = await segmentData.params;
  try {
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

    const parsed = await parseBody(request, deleteBodySchema);
    if ('error' in parsed) return parsed.error;
    const body: DeleteBody = parsed.data;

    const commentId = typeof body.commentId === 'string' ? body.commentId.trim() : '';
    const replyId = typeof body.replyId === 'string' ? body.replyId.trim() : '';

    if (!commentId) return badRequest('Comment ID is required');
    if (!isValidObjectId(commentId)) return badRequest('Invalid comment ID');
    if (replyId && !isValidObjectId(replyId)) return badRequest('Invalid reply ID');

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    const jobWithCommentActions = job as unknown as JobCommentActions;
    const result = replyId
      ? jobWithCommentActions.deleteReply(commentId, replyId, user._id)
      : jobWithCommentActions.deleteComment(commentId, user._id);

    if (!result?.success) {
      const statusCode =
        typeof result?.message === 'string' && result.message.toLowerCase().includes('not found')
          ? 404
          : 403;
      return respond({ message: result?.message ?? 'Failed to delete content' }, statusCode);
    }

    await job.save();
    await invalidateJobCommentCaches(jobId);

    await publishCommentEvent(jobId, EVENTS.COMMENT_DELETED, {
      commentId,
      replyId: replyId || null,
      jobId,
      deletedBy: user._id,
      type: replyId ? 'reply' : 'comment',
      timestamp: new Date().toISOString(),
    });

    if (!replyId) {
      await publishJobCountsUpdate(jobId, { commentCount: job.comments.length });
    }

    return respond({ success: true, message: result.message });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Delete comment error:', err);
    return respond(
      {
        message: 'Failed to delete comment',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
