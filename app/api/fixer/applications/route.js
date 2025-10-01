// app/api/fixer/applications/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

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
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'fixer_applications', 30, 60 * 1000);
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

    // Only fixers can access this endpoint
    if (session.user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can view applications' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    // Build query to find jobs where this fixer has applied
    const matchQuery = {
      'applications.fixer': session.user.id
    };

    // Add status filter if provided
    if (status) {
      matchQuery['applications.status'] = status;
    }

    // Add search filter if provided (with escaped regex to prevent ReDoS)
    if (search) {
      const sanitizedSearch = escapeRegex(search);
      matchQuery.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    // Find jobs with applications from this fixer
    const jobs = await Job.find(matchQuery)
      .populate('createdBy', 'name username profilePhoto')
      .populate('assignedTo', 'name username')
      .sort({ 'applications.appliedAt': -1 })
      .limit(limit)
      .skip(skip);

    // Transform the data to include application details
    const applications = jobs.map(job => {
      const application = job.applications.find(
        app => app.fixer.toString() === session.user.id
      );

      return {
        _id: application._id,
        job: {
          _id: job._id,
          title: job.title,
          description: job.description,
          budget: job.budget,
          location: job.location,
          status: job.status,
          createdAt: job.createdAt,
          deadline: job.deadline,
          skillsRequired: job.skillsRequired,
          createdBy: job.createdBy,
          assignedTo: job.assignedTo
        },
        proposedAmount: application.proposedAmount,
        timeEstimate: application.timeEstimate,
        coverLetter: application.coverLetter,
        status: application.status,
        appliedAt: application.appliedAt,
        materialsList: application.materialsList || []
      };
    });

    // Get total count for pagination
    const totalApplications = await Job.countDocuments(matchQuery);

    return NextResponse.json({
      success: true,
      applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalApplications / limit),
        totalApplications,
        hasNextPage: page < Math.ceil(totalApplications / limit),
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Fixer applications error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}