// app/api/jobs/browse/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'browse_jobs', 100, 60 * 1000);
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

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 12, 50);
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const location = searchParams.get('location') || '';
    const budgetMin = searchParams.get('budgetMin') ? parseInt(searchParams.get('budgetMin')) : null;
    const budgetMax = searchParams.get('budgetMax') ? parseInt(searchParams.get('budgetMax')) : null;
    const urgency = searchParams.get('urgency') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build query
    const query = { 
      status: 'open',
      deadline: { $gte: new Date() } // Only show jobs that haven't expired
    };

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by skills
    if (skills.length > 0) {
      query.skillsRequired = { $in: skills.map(skill => skill.toLowerCase()) };
    }

    // Filter by location
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } }
      ];
    }

    // Filter by budget
    if (budgetMin || budgetMax) {
      query['budget.type'] = { $ne: 'negotiable' };
      if (budgetMin) query['budget.amount'] = { $gte: budgetMin };
      if (budgetMax) {
        query['budget.amount'] = { 
          ...query['budget.amount'], 
          $lte: budgetMax 
        };
      }
    }

    // Filter by urgency
    if (urgency) {
      query.urgency = urgency;
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { featured: -1, createdAt: -1 };
        break;
      case 'deadline':
        sort = { deadline: 1 };
        break;
      case 'budget_high':
        sort = { 'budget.amount': -1, featured: -1 };
        break;
      case 'budget_low':
        sort = { 'budget.amount': 1, featured: -1 };
        break;
      case 'nearest':
        // For MVP, we'll sort by city match
        if (user.location?.city) {
          query['location.city'] = user.location.city;
        }
        sort = { featured: -1, createdAt: -1 };
        break;
      default:
        sort = { featured: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('createdBy', 'name username photoURL rating location isVerified')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query)
    ]);

    // Check if fixer can view full job details (has credits or is pro)
    const canViewFullDetails = user.role !== 'fixer' || 
                               user.plan?.type === 'pro' || 
                               (user.plan?.creditsUsed || 0) < 3;

    // Enhance jobs with additional data for the user
    const enhancedJobs = jobs.map(job => {
      // Check if user has applied
      const hasApplied = job.applications?.some(
        app => app.fixer?.toString() === user._id.toString() && app.status !== 'withdrawn'
      ) || false;

      // If fixer without credits, return limited data
      if (user.role === 'fixer' && !canViewFullDetails && !hasApplied) {
        return {
          _id: job._id,
          title: job.title,
          description: job.description.substring(0, 150) + '...', // Limited description
          skillsRequired: job.skillsRequired,
          budget: job.budget.type === 'negotiable' ? { type: 'negotiable' } : {
            type: job.budget.type,
            amount: job.budget.amount ? '₹' + Math.floor(job.budget.amount / 1000) + 'k+' : null
          }, // Approximated budget
          urgency: job.urgency,
          status: job.status,
          location: {
            city: job.location.city,
            state: job.location.state
          },
          createdBy: {
            name: job.createdBy.name,
            rating: job.createdBy.rating
          },
          applicationCount: job.applications?.length || 0,
          createdAt: job.createdAt,
          hasApplied: false,
          skillMatchPercentage: 0,
          isLocalJob: false,
          restrictedView: true,
          canApply: false
        };
      }

      // Calculate skill match percentage for fixers
      let skillMatchPercentage = 0;
      if (user.role === 'fixer' && user.skills) {
        const userSkills = user.skills || [];
        const requiredSkills = job.skillsRequired || [];
        const matchingSkills = requiredSkills.filter(skill => 
          userSkills.includes(skill.toLowerCase())
        );
        skillMatchPercentage = requiredSkills.length > 0 
          ? (matchingSkills.length / requiredSkills.length) * 100 
          : 0;
      }

      // Check if it's a local job
      const isLocalJob = user.location?.city?.toLowerCase() === 
                        job.location?.city?.toLowerCase();

      return {
        ...job,
        hasApplied,
        skillMatchPercentage: Math.round(skillMatchPercentage),
        isLocalJob,
        applicationCount: job.applications?.length || 0,
        applications: undefined // Remove applications from response
      };
    });

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
        skills,
        location,
        budgetMin,
        budgetMax,
        urgency,
        sortBy
      }
    });

  } catch (error) {
    console.error('Browse jobs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}