import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User";
import { rateLimit } from "@/utils/rateLimiting";

// GET /api/jobs - Browse jobs with filters
export async function GET(req) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(req, 'job_browse', 100, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit')) || 20, 1), 50); // Max 50 per request for performance
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const city = searchParams.get('city');
    const minBudget = searchParams.get('minBudget') ? parseFloat(searchParams.get('minBudget')) : null;
    const maxBudget = searchParams.get('maxBudget') ? parseFloat(searchParams.get('maxBudget')) : null;
    const urgency = searchParams.get('urgency');
    const sort = searchParams.get('sort') || 'newest';

    // Build query
    const query = { status: 'open' };
    
    if (skills.length > 0) {
      query.skillsRequired = { $in: skills.map(skill => skill.toLowerCase()) };
    }
    
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }
    
    if (minBudget !== null || maxBudget !== null) {
      query['budget.type'] = 'fixed';
      const budgetQuery = {};
      if (minBudget !== null) budgetQuery.$gte = minBudget;
      if (maxBudget !== null) budgetQuery.$lte = maxBudget;
      query['budget.amount'] = budgetQuery;
    }
    
    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'budget_high':
        sortQuery = { 'budget.amount': -1 };
        break;
      case 'budget_low':
        sortQuery = { 'budget.amount': 1 };
        break;
      case 'deadline':
        sortQuery = { deadline: 1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // For performance, only count on first page
    const promises = [
      Job.find(query)
        .populate('createdBy', 'name username photoURL rating location isVerified')
        .sort(sortQuery)
        .skip(skip)
        .limit(limit + 1) // Get one extra to check if there are more
    ];
    
    // Only count total on first page for performance
    if (page === 1) {
      promises.push(Job.countDocuments(query));
    }
    
    const results = await Promise.all(promises);
    const jobsWithExtra = results[0];
    const total = page === 1 ? results[1] : null;
    
    // Check if there are more jobs and remove the extra one
    const hasMore = jobsWithExtra.length > limit;
    const jobs = hasMore ? jobsWithExtra.slice(0, limit) : jobsWithExtra;

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        returned: jobs.length,
        hasMore,
        ...(total !== null && { 
          total, 
          totalPages: Math.ceil(total / limit) 
        }),
        nextPage: hasMore ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      },
      filters: {
        skills,
        city,
        minBudget,
        maxBudget,
        urgency,
        sort
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Jobs browse error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create a new job
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimiter(req, { max: 10, windowMs: 60000 });
    if (rateLimitResult.error) {
      return NextResponse.json({ error: rateLimitResult.error }, { status: 429 });
    }

    await connectDB();

    const data = await req.json();
    
    // Get user details
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate user can post jobs
    if (user.role !== 'hirer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only hirers can post jobs' }, { status: 403 });
    }

    // Create job with user ID
    const jobData = {
      ...data,
      createdBy: session.user.id
    };

    const job = new Job(jobData);
    await job.save();

    // Populate the created job with user details
    await job.populate('createdBy', 'name username photoURL rating');

    return NextResponse.json({
      success: true,
      job
    }, { status: 201 });

  } catch (error) {
    console.error('Job creation error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}