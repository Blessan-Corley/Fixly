import { getServerAbly, CHANNELS, EVENTS } from '@/lib/ably';
import { requireSession } from '@/lib/api/auth';
import { badRequest, notFound, respond, unauthorized } from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import User from '@/models/User';

import { getValidatedJobId, isValidObjectId } from '../../route.shared';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ jobId: string; commentId: string }>;
};

type DeleteCommentResult = {
  success?: boolean;
  message?: string;
};

type JobWithDeleteComment = {
  deleteComment: (commentId: string, userId: unknown) => DeleteCommentResult;
  save: () => Promise<unknown>;
};

async function publishCommentDeleted(jobId: string, commentId: string, userId: unknown) {
  try {
    const ably = getServerAbly();
    if (!ably) return;

    const channel = ably.channels.get(CHANNELS.jobComments(jobId));
    await channel.publish(EVENTS.COMMENT_DELETED, {
      commentId,
      replyId: null,
      jobId,
      deletedBy: userId,
      type: 'comment',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to publish comment deletion event:', error);
  }
}

export async function DELETE(_request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(_request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }
    const { jobId } = jobIdResult;
    const commentId = params?.commentId;

    if (!commentId) {
      return badRequest('Comment ID is required');
    }

    if (!isValidObjectId(commentId)) {
      return badRequest('Invalid comment ID');
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return notFound('User');
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return notFound('Job');
    }

    const jobWithDeleteComment = job as JobWithDeleteComment;
    const result = jobWithDeleteComment.deleteComment(commentId, user._id);
    if (!result?.success) {
      const statusCode =
        typeof result?.message === 'string' && result.message.toLowerCase().includes('not found')
          ? 404
          : 403;

      return respond(
        { message: result?.message || 'Failed to delete comment' },
        statusCode
      );
    }

    await jobWithDeleteComment.save();
    await publishCommentDeleted(jobId, commentId, user._id);

    return respond({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Delete comment by path error:', err);
    return respond(
      {
        message: 'Failed to delete comment',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
