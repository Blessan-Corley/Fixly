import { requireSession, respond } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { NOTIFICATION_TYPES, NotificationService } from '@/lib/services/notifications';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Review from '@/models/Review';
import User from '@/models/User';

import { UpdateReviewBody, UpdateReviewBodySchema, isValidObjectId } from './shared';

export async function PUT(request: Request): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) {
      return respond({ message: 'Authentication required' }, 401);
    }
    const currentUserId = auth.session.user.id;
    if (!currentUserId) {
      return respond({ message: 'Authentication required' }, 401);
    }
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, UpdateReviewBodySchema);
    if ('error' in parsedBody) {
      return parsedBody.error;
    }
    const body: UpdateReviewBody = parsedBody.data;

    const { reviewId, responseComment } = body;
    const trimmedComment = (responseComment || '').trim();

    if (!reviewId || !trimmedComment) {
      return respond(
        { message: 'Review ID and response comment are required' },
        400
      );
    }

    if (!isValidObjectId(reviewId)) {
      return respond({ message: 'Invalid review ID' }, 400);
    }

    if (trimmedComment.length > 500) {
      return respond(
        { message: 'Response comment too long (max 500 characters)' },
        400
      );
    }

    const responseModeration = await moderateUserGeneratedContent(trimmedComment, {
      context: 'review',
      fieldLabel: 'Review response',
      userId: currentUserId,
    });
    if (!responseModeration.allowed) {
      return respond(
        {
          message: responseModeration.message,
          violations: responseModeration.violations,
          suggestions: responseModeration.suggestions,
        },
        400
      );
    }

    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) {
      return respond({ message: 'Review not found' }, 404);
    }

    if (String(review.reviewee) !== currentUserId) {
      return respond(
        { message: 'You can only respond to reviews about you' },
        403
      );
    }

    review.response = {
      comment: trimmedComment,
      respondedAt: new Date(),
    };
    await review.save();

    try {
      const reviewee = await User.findById(review.reviewee).select('username').lean<{ username?: string } | null>();
      const actionUrl =
        reviewee?.username && reviewee.username.trim().length > 0
          ? `/profile/${reviewee.username}/reviews`
          : '/dashboard';

      await NotificationService.createNotification(
        String(review.reviewer),
        NOTIFICATION_TYPES.RATING_UPDATE,
        'New Response To Your Review',
        'The recipient has responded to your review.',
        actionUrl,
        { reviewId: String(review._id) }
      );
    } catch (notificationError) {
      logger.error('Failed to create review response notification:', notificationError);
    }

    return respond({
      success: true,
      message: 'Response added successfully',
    });
  } catch (error) {
    logger.error('Update review error:', error);
    return respond({ message: 'Failed to update review' }, 500);
  }
}
