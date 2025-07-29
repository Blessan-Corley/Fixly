// app/api/dashboard/recent-jobs/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

// app/api/dashboard/recent-jobs/route.js - Fix to match stats API pattern

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'recent_jobs', 60, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
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

    await connectDB();

    // ✅ CRITICAL FIX: Get user from database (same as stats API)
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // ✅ REMOVED: Don't get role from URL parameters
    // const role = searchParams.get('role') || user.role;
    // ✅ USE: Get role from database user
    const role = user.role;

    // ✅ VALIDATE: Ensure role is valid
    if (!role || !['fixer', 'hirer', 'admin'].includes(role)) {
      return NextResponse.json(
        { message: 'Invalid user role' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit')) || 5, 20);

    let jobs = [];

    if (role === 'hirer') {
      // Get recent jobs posted by this hirer
      jobs = await Job.find({ createdBy: user._id })
        .populate('assignedTo', 'name username photoURL rating')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Add application count
      jobs = jobs.map(job => ({
        ...job,
        applicationCount: job.applications?.length || 0,
        applications: undefined // Remove applications data
      }));

    } else if (role === 'fixer') {
      // Get recent jobs the fixer has applied to or been assigned
      const jobsWithApplications = await Job.find({
        $or: [
          { 'applications.fixer': user._id },
          { assignedTo: user._id }
        ]
      })
      .populate('createdBy', 'name username photoURL rating location')
      .sort({ 'applications.appliedAt': -1, 'progress.startedAt': -1 })
      .limit(limit)
      .lean();

      // Transform the data to include application status
      jobs = jobsWithApplications.map(job => {
        const userApplication = job.applications?.find(
          app => app.fixer.toString() === user._id.toString()
        );

        return {
          ...job,
          applicationStatus: userApplication?.status || 'assigned',
          appliedAt: userApplication?.appliedAt,
          proposedAmount: userApplication?.proposedAmount,
          applications: undefined // Remove applications data
        };
      });

    } else if (role === 'admin') {
      // Get recent jobs for admin overview
      jobs = await Job.find({})
        .populate('createdBy', 'name username photoURL')
        .populate('assignedTo', 'name username photoURL')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Add application count and basic stats
      jobs = jobs.map(job => ({
        ...job,
        applicationCount: job.applications?.length || 0,
        applications: undefined // Remove applications data
      }));
    }

    return NextResponse.json({
      success: true,  // ✅ ADD: Success flag
      jobs,
      total: jobs.length,
      role
    });

  } catch (error) {
    console.error('Recent jobs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch recent jobs' },
      { status: 500 }
    );
  }
}