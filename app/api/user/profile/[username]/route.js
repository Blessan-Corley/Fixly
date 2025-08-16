// app/api/user/profile/[username]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import User from '../../../../../models/User';
import Job from '../../../../../models/Job';
import Review from '../../../../../models/Review';
import { rateLimit } from '../../../../../utils/rateLimiting';

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

    await connectDB();

    // Find user by username
    const user = await User.findOne({ username })
      .select('-password -email -notifications -preferences -privacy -createdAt -updatedAt +lastActivityAt')
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

    return NextResponse.json({
      success: true,
      user: profileData
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}