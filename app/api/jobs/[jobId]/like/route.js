// app/api/jobs/[jobId]/like/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_likes', 100, 60 * 60 * 1000); // 100 likes per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many like actions. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Users can't like their own jobs
    if (job.createdBy.toString() === user._id.toString()) {
      return NextResponse.json(
        { message: 'You cannot like your own job' },
        { status: 400 }
      );
    }

    // Toggle like
    const result = job.toggleLike(user._id);
    await job.save();

    // Send notification to job creator if liked (not for unlike)
    if (result.liked) {
      const jobCreator = await User.findById(job.createdBy);
      if (jobCreator) {
        await jobCreator.addNotification(
          'job_liked',
          'Job Liked',
          `${user.name} liked your job "${job.title}".`,
          {
            jobId: job._id,
            fromUser: user._id
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: result.liked ? 'Job liked successfully' : 'Job unliked successfully',
      liked: result.liked,
      likeCount: result.likeCount
    });

  } catch (error) {
    console.error('Like job error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        message: 'Failed to process like action',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(jobId)
      .select('likes')
      .populate('likes.user', 'name username photoURL')
      .lean();

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    const likeCount = job.likes?.length || 0;
    const liked = session ? job.likes?.some(
      like => like.user?._id?.toString() === session.user.id
    ) : false;

    return NextResponse.json({
      likeCount,
      liked,
      likes: job.likes || []
    });

  } catch (error) {
    console.error('Get job likes error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch job likes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}