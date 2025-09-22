// app/api/jobs/post/route.js - Enhanced with all improvements
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { redisRateLimit } from '../../../../lib/redis';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import JobDraft from '../../../../models/JobDraft';
import User from '../../../../models/User';
import { ContentValidator } from '../../../../lib/validations/content-validator';

export const dynamic = 'force-dynamic';

// Simplified job posting for reliability
export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Redis-based rate limiting - 10 job posts per hour per IP
    const rateLimitResult = await redisRateLimit(`job_posting:${ip}`, 10, 3600);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many job posting requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'hirer') {
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

    // Check job posting rate limit
    if (!user.canPostJob()) {
      const nextAllowedTime = user.getNextJobPostTime();
      
      if (nextAllowedTime) {
        const hoursLeft = Math.ceil((nextAllowedTime - new Date()) / (1000 * 60 * 60));
        const minutesLeft = Math.ceil((nextAllowedTime - new Date()) / (1000 * 60));
        
        const timeMessage = hoursLeft >= 1 
          ? `${hoursLeft} hour(s)` 
          : `${minutesLeft} minute(s)`;
        
        return NextResponse.json(
          { message: `You can post another job in ${timeMessage}. Upgrade to Pro for unlimited posting!` },
          { status: 429 }
        );
      }
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request body'
      }, { status: 400 });
    }

    const {
      title,
      description,
      skillsRequired,
      budget,
      location,
      deadline,
      urgency,
      attachments,
      scheduledDate,
      featured,
      draftId // If converting from draft
    } = body;

    // Enhanced validation with content filtering
    if (!title || !description || !deadline || !location || !attachments) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: title, description, deadline, location, and at least 1 photo are required'
        },
        { status: 400 }
      );
    }

    // Validate title length (30 characters max)
    if (title.length > 30) {
      return NextResponse.json(
        {
          success: false,
          message: 'Job title cannot exceed 30 characters'
        },
        { status: 400 }
      );
    }

    // Validate attachments - at least 1 photo required
    const photos = attachments.filter(att => att.isImage);
    const videos = attachments.filter(att => att.isVideo);

    if (photos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'At least 1 photo is required'
        },
        { status: 400 }
      );
    }

    if (photos.length > 5 || videos.length > 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'Maximum 5 photos and 1 video allowed'
        },
        { status: 400 }
      );
    }

    // Content validation for title and description
    const titleValidation = await ContentValidator.validateContent(title, 'job_posting', session.user.id);
    if (!titleValidation.isValid) {
      const violations = titleValidation.violations.map(v => v.type).join(', ');
      return NextResponse.json(
        {
          success: false,
          message: `Job title contains inappropriate content: ${violations}`,
          violations: titleValidation.violations
        },
        { status: 400 }
      );
    }

    const descValidation = await ContentValidator.validateContent(description, 'job_posting', session.user.id);
    if (!descValidation.isValid) {
      const violations = descValidation.violations.map(v => v.type).join(', ');
      return NextResponse.json(
        {
          success: false,
          message: `Job description contains inappropriate content: ${violations}`,
          violations: descValidation.violations
        },
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

    // Create job data with enhanced attachment structure
    const jobData = {
      title: title?.trim() || '',
      description: description?.trim() || '',
      skillsRequired: skillsRequired || [],
      budget: {
        type: budget?.type || 'negotiable',
        amount: budget?.amount || 0,
        currency: 'INR',
        materialsIncluded: budget?.materialsIncluded || false
      },
      location: {
        address: location?.address?.trim() || '',
        city: location?.city?.trim() || '',
        state: location?.state?.trim() || '',
        pincode: location?.pincode || null,
        lat: location?.lat || null,
        lng: location?.lng || null
      },
      deadline: new Date(deadline),
      urgency: urgency || 'flexible',
      createdBy: user._id,
      status: 'open',
      featured: featured && user.plan?.type === 'pro' ? true : false,
      attachments: attachments.map(attachment => ({
        id: attachment.id,
        url: attachment.url,
        publicId: attachment.publicId,
        filename: attachment.filename || attachment.name,
        type: attachment.type,
        size: attachment.size,
        isImage: attachment.isImage,
        isVideo: attachment.isVideo,
        width: attachment.width,
        height: attachment.height,
        duration: attachment.duration,
        createdAt: attachment.createdAt || new Date()
      }))
    };

    if (scheduledDate) {
      jobData.scheduledDate = new Date(scheduledDate);
    }

    // Set featured expiry if featured
    if (jobData.featured) {
      jobData.featuredUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    // Create and save job
    const job = new Job(jobData);
    await job.save();

    // Handle draft conversion if draftId provided
    if (draftId) {
      try {
        const draft = await JobDraft.findOne({
          _id: draftId,
          createdBy: user._id
        });

        if (draft) {
          await draft.convertToJob(job._id);
          console.log(`📋➡️📝 Draft ${draftId} converted to job ${job._id}`);
        }
      } catch (draftError) {
        console.error('❌ Draft conversion error:', draftError);
        // Continue even if draft conversion fails
      }
    }

    // Update user's job posting stats and add notification
    try {
      user.lastJobPostedAt = new Date();
      user.jobsPosted = (user.jobsPosted || 0) + 1;
      user.lastActivityAt = new Date();

      // Add notification to user (if user model has this method)
      if (typeof user.addNotification === 'function') {
        user.addNotification(
          'job_posted',
          'Job Posted Successfully',
          `Your job "${job.title}" has been posted and is now visible to fixers.`
        );
      }

      await user.save();
    } catch (userUpdateError) {
      console.error('User update error:', userUpdateError);
      // Continue even if user update fails
    }

    // Populate the created job for response
    await job.populate('createdBy', 'name username photoURL rating location');

    // Return success response with enhanced data
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
        applicationCount: 0,
        timeRemaining: job.timeRemaining,
        isUrgent: job.isUrgent
      }
    }, { 
      status: 200,
      headers: {
        'X-Job-ID': job._id.toString(),
        'X-Job-Status': job.status,
        'X-Job-Featured': job.featured.toString()
      }
    });

  } catch (error) {
    console.error('Job posting error:', error);
    return NextResponse.json(
      { message: 'Failed to post job. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint for user's jobs
export async function GET(request) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Redis-based rate limiting - 100 requests per 15 minutes per IP
    const rateLimitResult = await redisRateLimit(`api_requests:${ip}`, 100, 900);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many requests. Please try again later.',
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        },
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
        { message: 'Only hirers can access this endpoint' },
        { status: 403 }
      );
    }

    // Parse query parameters with validation
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit')) || 10), 50);
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate status parameter - match Job model enum
    const validStatuses = ['open', 'in_progress', 'completed', 'cancelled', 'disputed', 'expired'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status parameter. Valid options: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build query
    const query = { createdBy: user._id };
    if (status) {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    // Before executing query, handle expired jobs if querying for expired status
    if (status === 'expired') {
      try {
        // Update expired jobs in database
        await Job.updateMany(
          {
            createdBy: user._id,
            status: 'open',
            deadline: { $lt: new Date() }
          },
          {
            $set: { status: 'expired' }
          }
        );
      } catch (updateError) {
        console.error('Error updating expired jobs:', updateError);
        // Continue with the query even if update fails
      }
    }

    // Execute query with error handling
    let jobs, total;
    try {
      [jobs, total] = await Promise.all([
        Job.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('assignedTo', 'name username photoURL rating')
          .lean(),
        Job.countDocuments(query)
      ]);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        { message: 'Database query failed. Please try again.' },
        { status: 500 }
      );
    }

    // Process jobs with enhanced data
    const jobsWithCounts = jobs.map(job => {
      const now = new Date();
      const deadline = new Date(job.deadline);
      const diff = deadline - now;
      
      // Calculate time remaining
      let timeRemaining;
      if (job.status === 'expired' || diff <= 0) {
        timeRemaining = 'Expired';
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) {
          timeRemaining = `${days} day${days > 1 ? 's' : ''}`;
        } else if (hours > 0) {
          timeRemaining = `${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
          timeRemaining = 'Less than 1 hour';
        }
      }
      
      return {
        ...job,
        applicationCount: job.applications?.filter(app => app.status !== 'withdrawn').length || 0,
        timeRemaining,
        isUrgent: diff <= 24 * 60 * 60 * 1000 && job.status === 'open', // Only urgent if still open
        isExpired: job.status === 'expired' || diff <= 0,
        applications: undefined // Remove applications from response for privacy
      };
    });

    return NextResponse.json({
      success: true,
      jobs: jobsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + jobs.length < total
      },
      filters: {
        status,
        sortBy,
        sortOrder
      }
    }, {
      status: 200,
      headers: {
        'X-Total-Count': total.toString(),
        'X-Page-Count': Math.ceil(total / limit).toString()
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