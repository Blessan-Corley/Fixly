// app/api/admin/jobs/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request) {
  try {
    // Apply rate limiting (stricter for admin endpoints)
    const rateLimitResult = await rateLimit(request, 'admin_jobs', 50, 60 * 1000); // 50 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const urgency = searchParams.get('urgency') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build query
    const query = {};

    // Search in title and description (with escaped regex to prevent ReDoS)
    if (search) {
      const sanitizedSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && ['open', 'in_progress', 'completed', 'cancelled', 'disputed'].includes(status)) {
      query.status = status;
    }

    // Filter by urgency
    if (urgency && ['asap', 'flexible', 'scheduled'].includes(urgency)) {
      query.urgency = urgency;
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'deadline':
        sort = { deadline: 1 };
        break;
      case 'budget_high':
        sort = { 'budget.amount': -1 };
        break;
      case 'budget_low':
        sort = { 'budget.amount': 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('createdBy', 'name username email photoURL location')
        .populate('assignedTo', 'name username photoURL rating')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query)
    ]);

    // Add computed fields
    const enhancedJobs = jobs.map(job => ({
      ...job,
      applicationCount: job.applications?.length || 0,
      isExpired: job.deadline < new Date(),
      daysOld: Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24)),
      applications: undefined // Remove applications data for privacy
    }));

    return NextResponse.json({
      jobs: enhancedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + jobs.length < total
      },
      filters: {
        search,
        status,
        urgency,
        sortBy
      }
    });

  } catch (error) {
    console.error('Admin jobs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'admin_job_action', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, jobIds, reason } = body;

    if (!action || !jobIds || !Array.isArray(jobIds)) {
      return NextResponse.json(
        { message: 'Action and job IDs are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const validActions = ['cancel', 'feature', 'unfeature', 'resolve_dispute'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action' },
        { status: 400 }
      );
    }

    let updateQuery = {};
    let successMessage = '';

    switch (action) {
      case 'cancel':
        updateQuery = { 
          status: 'cancelled',
          'cancellation.cancelled': true,
          'cancellation.cancelledBy': session.user.id,
          'cancellation.reason': reason || 'Cancelled by admin',
          'cancellation.cancelledAt': new Date()
        };
        successMessage = 'Jobs cancelled successfully';
        break;
      case 'feature':
        updateQuery = { 
          featured: true,
          featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };
        successMessage = 'Jobs featured successfully';
        break;
      case 'unfeature':
        updateQuery = { 
          featured: false,
          $unset: { featuredUntil: 1 }
        };
        successMessage = 'Jobs unfeatured successfully';
        break;
      case 'resolve_dispute':
        updateQuery = { 
          status: 'completed',
          'dispute.status': 'resolved',
          'dispute.resolvedBy': session.user.id,
          'dispute.resolution': reason || 'Resolved by admin',
          'dispute.resolvedAt': new Date()
        };
        successMessage = 'Disputes resolved successfully';
        break;
    }

    // Perform the action
    const result = await Job.updateMany(
      { _id: { $in: jobIds } },
      updateQuery
    );

    // Send notifications to affected users
    const jobs = await Job.find({ _id: { $in: jobIds } })
      .populate('createdBy assignedTo', 'notifications')
      .lean();

    for (const job of jobs) {
      if (action === 'cancel') {
        // Notify job creator
        if (job.createdBy) {
          const hirer = await User.findById(job.createdBy._id);
          await hirer.addNotification(
            'job_cancelled',
            'Job Cancelled by Admin',
            `Your job "${job.title}" has been cancelled by administration. ${reason || ''}`
          );
        }

        // Notify assigned fixer
        if (job.assignedTo) {
          const fixer = await User.findById(job.assignedTo._id);
          await fixer.addNotification(
            'job_cancelled',
            'Job Cancelled',
            `The job "${job.title}" has been cancelled by administration. ${reason || ''}`
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      affectedJobs: result.modifiedCount
    });

  } catch (error) {
    console.error('Admin job action error:', error);
    return NextResponse.json(
      { message: 'Failed to perform action' },
      { status: 500 }
    );
  }
}