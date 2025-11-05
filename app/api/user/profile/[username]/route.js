// app/api/user/profile/[username]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import User from '../../../../../models/User';
import Job from '../../../../../models/Job';
import Review from '../../../../../models/Review';
import { rateLimit } from '../../../../../utils/rateLimiting';
import { redisUtils } from '../../../../../lib/redis';

export const dynamic = 'force-dynamic';

// Get user profile by username
export async function GET(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'profile', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { username } = params;
    const session = await getServerSession(authOptions);

    // ✅ REDIS CACHING: Try cache first
    const cacheKey = `user:profile:${username}`;
    const cacheTTL = 15 * 60; // 15 minutes for user profiles

    try {
      const cachedProfile = await redisUtils.get(cacheKey);
      if (cachedProfile) {
        try {
          const parsedData = JSON.parse(cachedProfile);
          console.log('✅ Cache HIT for profile:', username);
          return NextResponse.json(parsedData, {
            headers: {
              'X-Cache': 'HIT',
              'Cache-Control': `max-age=${cacheTTL}`
            }
          });
        } catch (parseError) {
          console.warn('⚠️ Invalid cached data, clearing:', username);
          await redisUtils.del(cacheKey);
        }
      }
      console.log('❌ Cache MISS for profile:', username);
    } catch (cacheError) {
      console.error('⚠️ Profile cache read error:', cacheError);
    }

    await connectDB();

    // Find user by username
    const user = await User.findOne({ username })
      .select('-passwordHash -password -email -notifications -preferences -privacy -createdAt -updatedAt -__v')
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's job statistics
    const jobStats = await Job.aggregate([
      { $match: { $or: [{ client: user._id }, { fixer: user._id }] } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          activeJobs: { $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress']] }, 1, 0] } }
        }
      }
    ]);

    // Get recent reviews
    const recentReviews = await Review.find({
      reviewee: user._id,
      status: 'published',
      isPublic: true
    })
      .populate('reviewer', 'name username photoURL')
      .populate('job', 'title category')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get review statistics
    const reviewStats = await Review.getAverageRating(user._id);

    // Build response
    const profileData = {
      ...user,
      stats: {
        ...jobStats[0],
        reviews: reviewStats
      },
      recentReviews
    };

    // Hide sensitive information if not own profile
    if (!session || session.user.id !== user._id.toString()) {
      delete profileData.phone;
      delete profileData.address;
    }

    const response = {
      success: true,
      user: profileData
    };

    // ✅ REDIS CACHING: Store profile in cache
    try {
      await redisUtils.set(cacheKey, JSON.stringify(response), cacheTTL);
      console.log('✅ Profile cached successfully:', username);
    } catch (cacheError) {
      console.error('⚠️ Profile cache write error:', cacheError);
    }

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `max-age=${cacheTTL}`
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}