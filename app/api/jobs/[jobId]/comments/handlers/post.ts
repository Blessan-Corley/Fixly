import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import {
  badRequest,
  created,
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

import { publishJobCountsUpdate } from '../../realtime';
import { getValidatedJobId, type JobRouteContext } from '../../route.shared';

import {
  EVENTS,
  commentBodySchema,
  getUserPhotoUrl,
  invalidateJobCommentCaches,
  normalizeMentions,
  publishCommentEvent,
  sanitizeMessage,
  toIdString,
  type CommentBody,
} from './shared';

export async function POST(request: Request, segmentData: JobRouteContext) {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_comments', 100, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many comments. Please try again later.');
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

    const parsed = await parseBody(request, commentBodySchema);
    if ('error' in parsed) return parsed.error;
    const body: CommentBody = parsed.data;

    const message = sanitizeMessage(body.message);
    const mentions = normalizeMentions(body.mentions);
    if (!message) return badRequest('Comment message is required');
    if (message.length > 500) return badRequest('Comment cannot exceed 500 characters');

    const moderationResult = await moderateUserGeneratedContent(message, {
      context: 'comment',
      fieldLabel: 'Comment',
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

    const comment = {
      author: user._id,
      message: moderationResult.content,
      createdAt: new Date(),
      replies: [],
      likes: [],
      reactions: [],
      mentions,
    };

    job.comments.push(comment);
    await job.save();
    await invalidateJobCommentCaches(jobId);

    await job.populate({ path: 'comments.author', select: 'name username photoURL role' });

    const newComment = job.comments[job.comments.length - 1];

    if (toIdString(job.createdBy) !== toIdString(user._id)) {
      try {
        await sendTemplatedNotification(
          'JOB_COMMENT',
          toIdString(job.createdBy),
          {
            commenterName: user.name,
            jobTitle: job.title,
            jobId: String(job._id),
            commentId: String(newComment?._id ?? ''),
          },
          {
            senderId: String(user._id),
            priority: 'medium',
            actionData: { actionUrl: `/dashboard/jobs/${jobId}` },
          }
        );
      } catch (notificationError: unknown) {
        logger.error('Failed to notify job creator about comment:', notificationError);
      }
    }

    for (const mention of mentions) {
      if (mention.user === String(user._id)) continue;
      try {
        await sendTemplatedNotification(
          'JOB_COMMENT',
          mention.user,
          {
            commenterName: user.name,
            jobTitle: job.title,
            jobId: String(job._id),
            commentId: String(newComment?._id ?? ''),
          },
          {
            senderId: String(user._id),
            priority: 'medium',
            actionData: { actionUrl: `/dashboard/jobs/${jobId}` },
          }
        );
      } catch (mentionError: unknown) {
        logger.error('Failed to notify mentioned user about comment:', mentionError);
      }
    }

    await publishCommentEvent(jobId, EVENTS.COMMENT_POSTED, {
      comment: newComment,
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

    await publishJobCountsUpdate(jobId, { commentCount: job.comments.length });

    return created({ success: true, message: 'Comment posted successfully', comment: newComment });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Post comment error:', err);
    return respond(
      {
        message: 'Failed to post comment',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
