import { respond } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Review from '@/models/Review';
import { rateLimit } from '@/utils/rateLimiting';

import {
  ALLOWED_SORT_FIELDS,
  escapeRegex,
  isValidObjectId,
  parsePositiveInt,
} from './shared';

const REVIEWS_CACHE_TTL = 300; // 5 minutes

type ReviewAverageStats = Awaited<ReturnType<typeof Review.getAverageRating>>;
type ReviewDetailedStats = Awaited<ReturnType<typeof Review.getDetailedRatings>>;

type RatingStatsResponse = ReviewAverageStats & {
  detailed?: {
    asFixer: ReviewDetailedStats;
    asClient: ReviewDetailedStats;
  };
};

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'reviews', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond({ message: 'Too many requests. Please try again later.' }, 429);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jobId = searchParams.get('jobId');
    const reviewType = searchParams.get('reviewType');
    const minRating = Number(searchParams.get('minRating') || 0);
    const search = (searchParams.get('search') || '').trim();
    const page = parsePositiveInt(searchParams.get('page'), 1, 1, 10000);
    const limit = parsePositiveInt(searchParams.get('limit'), 10, 1, 50);
    const sortByParam = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const sortBy = ALLOWED_SORT_FIELDS[sortByParam] || 'createdAt';

    const query: Record<string, unknown> = {
      status: 'published',
      isPublic: true,
    };

    if (isValidObjectId(userId)) {
      query.reviewee = userId;
    }

    if (isValidObjectId(jobId)) {
      query.job = jobId;
    }

    if (reviewType === 'client_to_fixer' || reviewType === 'fixer_to_client') {
      query.reviewType = reviewType;
    }

    if (!Number.isNaN(minRating) && minRating >= 1 && minRating <= 5) {
      query['rating.overall'] = { $gte: minRating };
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ title: regex }, { comment: regex }, { pros: regex }, { cons: regex }];
    }

    const cacheKey = `reviews:v1:${userId ?? '-'}:${jobId ?? '-'}:${reviewType ?? '-'}:${minRating}:${search || '-'}:${page}:${limit}:${sortBy}:${sortOrder === 1 ? 'asc' : 'desc'}`;
    const cached = await redisUtils.get<unknown>(cacheKey);
    if (cached !== null) {
      return respond(cached as Record<string, unknown>);
    }

    const skip = (page - 1) * limit;
    const reviews = await Review.find(query)
      .populate('reviewer', 'name username photoURL role rating')
      .populate('reviewee', 'name username photoURL role rating')
      .populate('job', 'title category budget status')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalReviews = await Review.countDocuments(query);

    let ratingStats: RatingStatsResponse | null = null;
    if (isValidObjectId(userId)) {
      ratingStats = await Review.getAverageRating(userId);
      const clientToFixerStats = await Review.getDetailedRatings(userId, 'client_to_fixer');
      const fixerToClientStats = await Review.getDetailedRatings(userId, 'fixer_to_client');

      ratingStats.detailed = {
        asFixer: clientToFixerStats,
        asClient: fixerToClientStats,
      };
    }

    const responseData = {
      success: true,
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasMore: skip + reviews.length < totalReviews,
      },
      ratingStats,
    };

    await redisUtils.set(cacheKey, responseData, REVIEWS_CACHE_TTL);

    return respond(responseData);
  } catch (error) {
    logger.error('Get reviews error:', error);
    return respond({ message: 'Failed to fetch reviews' }, 500);
  }
}
