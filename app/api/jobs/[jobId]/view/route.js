// app/api/jobs/[jobId]/view/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';

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

    const user = await User.findById(session.user.id);
    const job = await Job.findById(jobId);

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Don't count views from the job creator
    if (job.createdBy.toString() === user._id.toString()) {
      return NextResponse.json({ success: true });
    }

    // Check if user already viewed this job today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyViewedToday = job.viewedBy?.some(view => 
      view.user.toString() === user._id.toString() &&
      new Date(view.viewedAt) >= today
    );

    if (!alreadyViewedToday) {
      // Increment view count and add to viewedBy array
      job.views = (job.views || 0) + 1;
      
      if (!job.viewedBy) {
        job.viewedBy = [];
      }
      
      job.viewedBy.push({
        user: user._id,
        viewedAt: new Date()
      });

      // Keep only last 100 views to prevent array from growing too large
      if (job.viewedBy.length > 100) {
        job.viewedBy = job.viewedBy.slice(-100);
      }

      await job.save();
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Job view tracking error:', error);
    return NextResponse.json(
      { message: 'Failed to track view' },
      { status: 500 }
    );
  }
}