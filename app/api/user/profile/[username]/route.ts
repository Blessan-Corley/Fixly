import { badRequest, getOptionalSession, notFound, respond, serverError } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type UsernameParams = {
  params: Promise<{
    username: string;
  }>;
};

type ProfileUser = Record<string, unknown> & {
  _id: unknown;
  phone?: string;
  address?: string;
};

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function parseCachedPayload(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

export async function GET(request: Request, props: UsernameParams) {
  const params = await props.params;
  try {
    const rateLimitResult = await rateLimit(request, 'profile', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return respond(
        { message: 'Too many requests. Please try again later.' },
        429
      );
    }

    const username = normalizeUsername(params.username || '');
    if (!username) {
      return badRequest('Username is required');
    }

    const session = await getOptionalSession();
    const cacheKey = `user:profile:${username}`;
    const cacheTTL = 15 * 60;

    try {
      const cachedProfile = await redisUtils.get(cacheKey);
      const parsedCache = parseCachedPayload(cachedProfile);

      if (parsedCache) {
        return respond(parsedCache, 200, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': `max-age=${cacheTTL}`,
          },
        });
      }

      if (cachedProfile) {
        await redisUtils.del(cacheKey);
      }
    } catch (cacheError: unknown) {
      logger.error('Profile cache read error:', cacheError as Error);
    }

    await connectDB();

    const user = await User.findOne({ username })
      .select(
        '-passwordHash -password -email -notifications -preferences -privacy -createdAt -updatedAt -__v'
      )
      .lean<ProfileUser | null>();

    if (!user) {
      return notFound('User');
    }

    const [jobStats, recentReviews, reviewStats] = await Promise.all([
      Job.aggregate([
        { $match: { $or: [{ client: user._id }, { fixer: user._id }] } },
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            activeJobs: { $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0] } },
          },
        },
      ]),
      Review.find({
        reviewee: user._id,
        status: 'published',
        isPublic: true,
      })
        .populate('reviewer', 'name username photoURL')
        .populate('job', 'title category')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Review.getAverageRating(String(user._id)),
    ]);

    const profileData: Record<string, unknown> = {
      ...user,
      stats: {
        ...(jobStats?.[0] || {}),
        reviews: reviewStats,
      },
      recentReviews,
    };

    if (!session?.user?.id || session.user.id !== String(user._id)) {
      delete profileData.phone;
      delete profileData.address;
    }

    const responsePayload = {
      success: true,
      user: profileData,
    };

    try {
      await redisUtils.set(cacheKey, responsePayload, cacheTTL);
    } catch (cacheError: unknown) {
      logger.error('Profile cache write error:', cacheError as Error);
    }

    return respond(responsePayload, 200, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `max-age=${cacheTTL}`,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Get user profile error:', err);
    return serverError('Failed to fetch user profile');
  }
}
