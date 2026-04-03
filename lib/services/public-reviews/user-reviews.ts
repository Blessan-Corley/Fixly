import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Review from '@/models/Review';

import {
  isValidObjectId,
  toObjectId,
  type UserReviewsListResult,
} from './types';

const USER_REVIEWS_TTL = 300; // 5 minutes

export async function listUserReviews(
  userId: string,
  pagination: { page: number; limit: number }
): Promise<UserReviewsListResult> {
  if (!isValidObjectId(userId)) {
    return {
      items: [],
      total: 0,
      stats: {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    };
  }

  const cacheKey = `user:reviews:v2:${userId}:${pagination.page}:${pagination.limit}`;
  const cached = await redisUtils.get<UserReviewsListResult>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  await connectDB();

  const skip = (pagination.page - 1) * pagination.limit;
  const query = {
    reviewee: toObjectId(userId),
    status: 'published',
    isPublic: true,
  };

  const [items, total, ratingStats] = await Promise.all([
    Review.find(query)
      .select(
        [
          'reviewer',
          'job',
          'rating',
          'title',
          'comment',
          'createdAt',
          'reviewType',
          'wouldRecommend',
          'helpfulVotes',
          'response',
          'tags',
        ].join(' ')
      )
      .populate('reviewer', 'name username photoURL profilePhoto')
      .populate('job', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pagination.limit)
      .lean<Array<Record<string, unknown>>>(),
    Review.countDocuments(query),
    Review.getAverageRating(userId),
  ]);

  const result: UserReviewsListResult = {
    items,
    total,
    stats: {
      averageRating: ratingStats.average,
      totalReviews: ratingStats.total,
      distribution: ratingStats.distribution,
    },
  };
  await redisUtils.set(cacheKey, result, USER_REVIEWS_TTL);
  return result;
}
