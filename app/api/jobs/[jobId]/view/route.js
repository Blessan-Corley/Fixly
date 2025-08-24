// app/api/jobs/[jobId]/view/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Job from '../../../../models/Job';
import { analytics } from '../../../../lib/cache';

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

      // Track in analytics system
      await analytics.trackEvent('job_viewed', {
        jobId: job._id,
        jobTitle: job.title,
        jobCategory: job.skillsRequired[0],
        jobBudget: job.budget.amount,
        jobBudgetType: job.budget.type,
        viewCount: viewCount,
        userAgent: userAgent,
        ipAddress: ipAddress
      }, session.user.id);
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