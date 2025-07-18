import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'browse_jobs', 100, 60); // 100 requests per minute
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
    if (!user || user.role !== 'fixer') {
      return NextResponse.json(
        { message: 'Only fixers can browse jobs' },
        { status: 403 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 12, 50); // Max 50 per page
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills') || '';
    const location = searchParams.get('location') || '';
    const budgetMin = searchParams.get('budgetMin') || '';
    const budgetMax = searchParams.get('budgetMax') || '';
    const urgency = searchParams.get('urgency') || '';
    const type = searchParams.get('type') || '';
    const experienceLevel = searchParams.get('experienceLevel') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const deadline = searchParams.get('deadline') || '';

    // Build query for open jobs only
    const query = {
      status: 'open',
      deadline: { $gt: new Date() } // Only show jobs with future deadlines
    };

    // Text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ];
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim().toLowerCase());
      query.skillsRequired = { $in: skillsArray };
    }

    // Location filter
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } },
        { 'location.address': { $regex: location, $options: 'i' } }
      ];
    }

    // Budget filters
    if (budgetMin || budgetMax) {
      query['budget.amount'] = {};
      if (budgetMin) {
        query['budget.amount'].$gte = parseInt(budgetMin);
      }
      if (budgetMax) {
        query['budget.amount'].$lte = parseInt(budgetMax);
      }
      // Include negotiable budgets
      query.$or = [
        { 'budget.amount': query['budget.amount'] },
        { 'budget.type': 'negotiable' }
      ];
    }

    // Urgency filter
    if (urgency) {
      query.urgency = urgency;
    }

    // Job type filter
    if (type) {
      query.type = type;
    }

    // Experience level filter
    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    // Deadline filter
    if (deadline) {
      const now = new Date();
      switch (deadline) {
        case 'today':
          const endOfToday = new Date(now);
          endOfToday.setHours(23, 59, 59, 999);
          query.deadline = { $gte: now, $lte: endOfToday };
          break;
        case 'week':
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          query.deadline = { $gte: now, $lte: nextWeek };
          break;
        case 'month':
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          query.deadline = { $gte: now, $lte: nextMonth };
          break;
      }
    }

    // Build sort
    const sort = {};
    switch (sortBy) {
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'deadline':
        sort.deadline = 1;
        break;
      case 'budget_high':
        sort['budget.amount'] = -1;
        break;
      case 'budget_low':
        sort['budget.amount'] = 1;
        break;
      case 'nearest':
        // For nearest, we would need geospatial queries
        // For now, prioritize same city then same state
        if (user.location?.city) {
          sort['location.city'] = user.location.city;
        }
        sort.createdAt = -1;
        break;
      default:
        sort.featured = -1; // Featured jobs first
        sort.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    // Execute queries
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('createdBy', 'name username photoURL rating location isVerified')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean for better performance
      Job.countDocuments(query)
    ]);

    // Add application count and user-specific data to each job
    const jobsWithExtras = await Promise.all(
      jobs.map(async (job) => {
        // Get application count
        const applicationCount = job.applications?.length || 0;
        
        // Check if user has already applied
        const hasApplied = job.applications?.some(
          app => app.fixer.toString() === user._id.toString()
        ) || false;

        // Calculate skill match percentage
        const userSkills = user.skills || [];
        const requiredSkills = job.skillsRequired || [];
        const matchingSkills = requiredSkills.filter(skill => 
          userSkills.includes(skill.toLowerCase())
        );
        const skillMatchPercentage = requiredSkills.length > 0 
          ? (matchingSkills.length / requiredSkills.length) * 100 
          : 0;

        // Calculate distance (simplified - using city match for now)
        const isLocalJob = user.location?.city?.toLowerCase() === 
                          job.location?.city?.toLowerCase();

        return {
          ...job,
          applicationCount,
          hasApplied,
          skillMatchPercentage,
          isLocalJob,
          applications: undefined // Remove applications array from response
        };
      })
    );

    const hasMore = skip + jobs.length < total;

    return NextResponse.json({
      jobs: jobsWithExtras,
      pagination: {
        page,
        limit,
        total,
        hasMore
      },
      filters: {
        search,
        skills: skills ? skills.split(',') : [],
        location,
        budgetMin,
        budgetMax,
        urgency,
        type,
        experienceLevel,
        sortBy,
        deadline
      }
    });

  } catch (error) {
    console.error('Browse jobs error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}