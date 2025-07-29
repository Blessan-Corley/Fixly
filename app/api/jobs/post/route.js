// app/api/jobs/post/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_posting', 5, 60 * 60 * 1000); // 5 jobs per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many job posts. Please try again later.' },
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
    if (!user || user.role !== 'hirer') {
      return NextResponse.json(
        { message: 'Only hirers can post jobs' },
        { status: 403 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    // Check 6-hour rate limit for job posting
    if (!user.canPostJob()) {
      const nextAllowedTime = new Date(user.lastJobPostedAt.getTime() + 6 * 60 * 60 * 1000);
      const hoursLeft = Math.ceil((nextAllowedTime - new Date()) / (1000 * 60 * 60));
      
      return NextResponse.json(
        { 
          message: `You can post another job in ${hoursLeft} hour(s). This helps maintain quality on our platform.` 
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      skillsRequired,
      budget,
      location,
      deadline,
      urgency,
      type,
      experienceLevel,
      attachments,
      scheduledDate,
      estimatedDuration,
      featured
    } = body;

    // Validation
    if (!title || !description || !skillsRequired || !budget || !location || !deadline) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (title.length < 10 || title.length > 100) {
      return NextResponse.json(
        { message: 'Title must be between 10 and 100 characters' },
        { status: 400 }
      );
    }

    if (description.length < 30 || description.length > 2000) {
      return NextResponse.json(
        { message: 'Description must be between 30 and 2000 characters' },
        { status: 400 }
      );
    }

    if (!Array.isArray(skillsRequired) || skillsRequired.length === 0) {
      return NextResponse.json(
        { message: 'At least one skill is required' },
        { status: 400 }
      );
    }

    if (new Date(deadline) <= new Date()) {
      return NextResponse.json(
        { message: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    if (scheduledDate && new Date(scheduledDate) <= new Date()) {
      return NextResponse.json(
        { message: 'Scheduled date must be in the future' },
        { status: 400 }
      );
    }

    // Validate budget
    if (budget.type !== 'negotiable' && (!budget.amount || budget.amount <= 0)) {
      return NextResponse.json(
        { message: 'Budget amount is required for fixed and hourly pricing' },
        { status: 400 }
      );
    }

    // Validate location
    if (!location.address || !location.city || !location.state) {
      return NextResponse.json(
        { message: 'Complete address is required' },
        { status: 400 }
      );
    }

    if (location.pincode && !/^[0-9]{6}$/.test(location.pincode)) {
      return NextResponse.json(
        { message: 'Invalid pincode format' },
        { status: 400 }
      );
    }

    // Create job
    const jobData = {
      title: title.trim(),
      description: description.trim(),
      skillsRequired: skillsRequired.map(skill => skill.toLowerCase().trim()),
      budget: {
        type: budget.type || 'negotiable',
        amount: budget.amount || 0,
        currency: 'INR',
        materialsIncluded: budget.materialsIncluded || false
      },
      location: {
        address: location.address.trim(),
        city: location.city.trim(),
        state: location.state.trim(),
        pincode: location.pincode || null,
        lat: location.lat || null,
        lng: location.lng || null
      },
      deadline: new Date(deadline),
      urgency: urgency || 'flexible',
      type: type || 'one-time',
      experienceLevel: experienceLevel || 'intermediate',
      createdBy: user._id,
      status: 'open',
      featured: featured && user.plan?.type === 'pro' ? true : false
    };

    if (scheduledDate) {
      jobData.scheduledDate = new Date(scheduledDate);
    }

    if (estimatedDuration) {
      jobData.estimatedDuration = {
        value: estimatedDuration.value,
        unit: estimatedDuration.unit || 'hours'
      };
    }

    if (attachments && attachments.length > 0) {
      jobData.attachments = attachments.map(attachment => ({
        url: attachment.url,
        filename: attachment.filename,
        fileType: attachment.fileType,
        size: attachment.size
      }));
    }

    // Set featured expiry if featured
    if (jobData.featured) {
      jobData.featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    const job = new Job(jobData);
    await job.save();

    // Update user's last job posted time and count
    user.lastJobPostedAt = new Date();
    user.jobsPosted = (user.jobsPosted || 0) + 1;
    await user.save();

    // Add notification to user
    await user.addNotification(
      'job_posted',
      'Job Posted Successfully',
      `Your job "${job.title}" has been posted and is now visible to fixers.`
    );

    // Populate the created job for response
    await job.populate('createdBy', 'name username photoURL rating location');

    return NextResponse.json({
      success: true,
      message: 'Job posted successfully',
      job: {
        _id: job._id,
        title: job.title,
        description: job.description,
        budget: job.budget,
        location: job.location,
        deadline: job.deadline,
        urgency: job.urgency,
        status: job.status,
        featured: job.featured,
        createdAt: job.createdAt,
        skillsRequired: job.skillsRequired,
        applicationCount: 0
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Job posting error:', error);
    return NextResponse.json(
      { message: 'Failed to post job. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'hirer') {
      return NextResponse.json(
        { message: 'Only hirers can access this endpoint' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 10, 50);
    const status = searchParams.get('status') || '';

    const query = { createdBy: user._id };
    
    if (status && ['open', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name username photoURL rating')
        .lean(),
      Job.countDocuments(query)
    ]);

    // Add application count to each job
    const jobsWithCounts = jobs.map(job => ({
      ...job,
      applicationCount: job.applications?.length || 0,
      applications: undefined // Remove applications from response for privacy
    }));

    return NextResponse.json({
      jobs: jobsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + jobs.length < total
      }
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}