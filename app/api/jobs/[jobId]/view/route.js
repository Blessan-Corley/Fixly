// app/api/jobs/[jobId]/view/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
// Analytics tracking removed - focusing on core functionality
import { getServerAbly, CHANNELS, EVENTS } from '../../../../../lib/ably';

export async function POST(request, { params }) {
  try {
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

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Get client info for analytics
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Add view to job using new analytics method
    const viewCount = job.addView(session.user.id, ipAddress, userAgent);
    if (viewCount > 0) {
      await job.save();

      // View tracking removed - using simple console.log instead
      console.log('👁️ Job viewed', {
        jobId: job._id,
        userId: session.user.id,
        viewCount: viewCount,
        timestamp: new Date().toISOString()
      });

      // Broadcast real-time view count update
      try {
        const ably = getServerAbly();
        const channel = ably.channels.get(CHANNELS.jobUpdates(jobId));

        await channel.publish(EVENTS.JOB_UPDATED, {
          jobId: job._id,
          type: 'view_count',
          viewCount: job.views?.count || 0,
          timestamp: new Date().toISOString(),
          viewer: {
            id: session.user.id,
            name: session.user.name
          }
        });

        console.log(`📊 Real-time view count broadcast: ${job.views?.count || 0} views for job ${jobId}`);
      } catch (ablyError) {
        console.error('❌ Failed to broadcast view count update:', ablyError);
        // Don't fail the request if real-time fails
      }
    }

    return NextResponse.json({
      success: true,
      viewCount: job.views?.count || 0,
      message: 'View tracked successfully'
    });

  } catch (error) {
    console.error('Track view error:', error);
    return NextResponse.json(
      { message: 'Failed to track view' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(jobId).select('views');
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      views: {
        total: job.views?.count || 0,
        uniqueViewers: job.views?.uniqueViewers?.length || 0,
        dailyViews: job.views?.dailyViews || []
      }
    });

  } catch (error) {
    console.error('Get view stats error:', error);
    return NextResponse.json(
      { message: 'Failed to get view statistics' },
      { status: 500 }
    );
  }
}