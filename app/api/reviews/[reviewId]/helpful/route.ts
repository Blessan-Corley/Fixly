import { Types } from 'mongoose';

import { requireSession, respond } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { ReviewHelpfulSchema } from '@/lib/validations/review';
import Review from '@/models/Review';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    reviewId: string;
  }>;
};

export async function POST(request: Request, props: RouteContext) {
  const params = await props.params;
  try {
    const rateLimitResult = await rateLimit(request, 'review_helpful', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond(
        { message: 'Too many requests. Please try again later.' },
        429
      );
    }

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

    const parsed = ReviewHelpfulSchema.safeParse({ reviewId: params.reviewId });
    if (!parsed.success) {
      return respond(
        { error: 'Validation failed', details: parsed.error.flatten() },
        400
      );
    }

    const { reviewId } = parsed.data;
    if (!Types.ObjectId.isValid(reviewId)) {
      return respond({ message: 'Invalid review ID' }, 400);
    }

    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) {
      return respond({ message: 'Review not found' }, 404);
    }

    if (String(review.reviewer) === currentUserId) {
      return respond({ message: 'You cannot vote on your own review' }, 400);
    }

    if (!review.helpfulVotes) {
      review.helpfulVotes = { count: 0, users: [] };
    }

    const users = Array.isArray(review.helpfulVotes.users) ? review.helpfulVotes.users : [];
    const hasVoted = users.some((id: unknown) => String(id) === currentUserId);

    if (hasVoted) {
      review.helpfulVotes.users = users.filter((id: unknown) => String(id) !== currentUserId);
      review.helpfulVotes.count = review.helpfulVotes.users.length;
      await review.save();

      return respond({
        success: true,
        action: 'removed',
        helpfulCount: review.helpfulVotes.count,
      });
    }

    review.helpfulVotes.users = [...users, new Types.ObjectId(currentUserId)];
    review.helpfulVotes.count = review.helpfulVotes.users.length;
    await review.save();

    return respond({
      success: true,
      action: 'added',
      helpfulCount: review.helpfulVotes.count,
    });
  } catch (error) {
    logger.error('Toggle helpful vote error:', error);
    return respond({ message: 'Failed to toggle helpful vote' }, 500);
  }
}
