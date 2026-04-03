import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import {
  badRequest,
  forbidden,
  notFound,
  respond,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { sendTemplatedNotification } from '@/lib/services/notifications';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { getValidatedJobId, isValidObjectId, type JobRouteContext } from '../../route.shared';

import {
  EVENTS,
  getUserPhotoUrl,
  invalidateJobCommentCaches,
  normalizeMentions,
  publishCommentEvent,
  replyBodySchema,
  sanitizeMessage,
  toIdString,
  type ReplyBody,
} from './shared';

export async function PUT(request: Request, segmentData: JobRouteContext) {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'comment_replies', 200, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many replies. Please try again later.');
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

    const parsed = await parseBody(request, replyBodySchema);
    if ('error' in parsed) return parsed.error;
    const body: ReplyBody = parsed.data;

    const commentId = typeof body.commentId === 'string' ? body.commentId.trim() : '';
    const message = sanitizeMessage(body.message);
    const mentions = normalizeMentions(body.mentions);

    if (!commentId || !message) return badRequest('Job ID, comment ID, and message are required');
    if (!isValidObjectId(commentId)) return badRequest('Invalid comment ID');
    if (message.length > 500) return badRequest('Reply cannot exceed 500 characters');

    const moderationResult = await moderateUserGeneratedContent(message, {
      context: 'comment',
      fieldLabel: 'Reply',
      userId,
      allowRanges: mentions.map((mention) => ({
        startIndex: mention.startIndex,
        endIndex: mention.endIndex,
      })),
    });

    if (!moderationResult.allowed) {
      return respond(
        {
          message: moderationResult.message,
          violations: moderationResult.violations,
          type: 'sensitive_content',
        },
        400
      );
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');
    if (user.banned) return forbidden('Account suspended');

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    const comment = job.comments.id(commentId);
    if (!comment) return notFound('Comment');

    const reply = {
      author: user._id,
      message: moderationResult.content,
      createdAt: new Date(),
      likes: [],
      reactions: [],
      mentions,
    };

    comment.replies.push(reply);
    await job.save();
    await invalidateJobCommentCaches(jobId);

    await job.populate({ path: 'comments.replies.author', select: 'name username photoURL role' });

    const updatedComment = job.comments.id(commentId);
    const latestReply = updatedComment?.replies?.[updatedComment.replies.length - 1];

    if (toIdString(comment.author) !== toIdString(user._id)) {
      try {
        await sendTemplatedNotification(
          'COMMENT_REPLY',
          toIdString(comment.author),
          {
            replierName: user.name,
            jobId: String(job._id),
            commentId: String(comment._id),
            replyId: String(latestReply?._id ?? ''),
          },
          {
            senderId: String(user._id),
            priority: 'medium',
            actionData: { actionUrl: `/dashboard/jobs/${jobId}` },
          }
        );
      } catch (notificationError: unknown) {
        logger.error('Failed to notify original commenter:', notificationError);
      }
    }

    for (const mention of mentions) {
      if (mention.user === String(user._id)) continue;
      try {
        await sendTemplatedNotification(
          'COMMENT_REPLY',
          mention.user,
          {
            replierName: user.name,
            jobId: String(job._id),
            commentId: String(comment._id),
            replyId: String(latestReply?._id ?? ''),
          },
          {
            senderId: String(user._id),
            priority: 'medium',
            actionData: { actionUrl: `/dashboard/jobs/${jobId}` },
          }
        );
      } catch (mentionError: unknown) {
        logger.error('Failed to notify mentioned user about reply:', mentionError);
      }
    }

    await publishCommentEvent(jobId, EVENTS.COMMENT_REPLIED, {
      commentId,
      reply: latestReply,
      jobId,
      author: {
        _id: user._id,
        name: user.name,
        username: user.username,
        photoURL: getUserPhotoUrl(user),
        role: user.role,
      },
      timestamp: new Date().toISOString(),
    });

    return respond({ success: true, message: 'Reply posted successfully', comment: updatedComment });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Post reply error:', err);
    return respond(
      {
        message: 'Failed to post reply',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
