// app/api/jobs/post/route.js - Enhanced with all improvements
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';
import { validateData, sanitizeObject, withSecurity } from '../../../../utils/validation';
import { 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  DatabaseError,
  handleDatabaseError,
  withErrorHandling
} from '../../../../utils/errorHandling';

export const dynamic = 'force-dynamic';

// Enhanced job posting with all security measures
export const POST = withErrorHandling(async (request) => {
  try {
    // Apply comprehensive security middleware
    const securityResponse = await withSecurity({
      validationSchema: 'jobPosting',
      rateLimitType: 'job_posting',
      maxAttempts: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      maxSize: 5 * 1024 * 1024, // 5MB
      corsOrigins: ['*']
    })(request);

    if (securityResponse) {
      return securityResponse;
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AuthenticationError('Authentication required');
    }

    // Connect to database
    await connectDB();

    // Get user with enhanced validation
    const user = await User.findById(session.user.id);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (user.role !== 'hirer') {
      throw new AuthorizationError('Only hirers can post jobs');
    }

    if (user.banned) {
      throw new AuthorizationError('Account suspended');
    }

    // Check job posting rate limit
    if (!user.canPostJob()) {
      const nextAllowedTime = new Date(user.lastJobPostedAt.getTime() + 6 * 60 * 60 * 1000);
      const hoursLeft = Math.ceil((nextAllowedTime - new Date()) / (1000 * 60 * 60));
      
      throw new ValidationError(
        `You can post another job in ${hoursLeft} hour(s). This helps maintain quality on our platform.`
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const sanitizedBody = sanitizeObject(body);

    // Enhanced validation
    const validation = validateData(sanitizedBody, 'jobPosting');
    if (!validation.valid) {
      throw new ValidationError('Invalid job data', validation.errors);
    }

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
    } = sanitizedBody;

    // Additional business logic validation
    if (new Date(deadline) <= new Date()) {
      throw new ValidationError('Deadline must be in the future');
    }

    if (scheduledDate && new Date(scheduledDate) <= new Date()) {
      throw new ValidationError('Scheduled date must be in the future');
    }

    // Validate budget for fixed/hourly jobs
    if (budget.type !== 'negotiable' && (!budget.amount || budget.amount <= 0)) {
      throw new ValidationError('Budget amount is required for fixed and hourly pricing');
    }

    // Validate location
    if (!location.address || !location.city || !location.state) {
      throw new ValidationError('Complete address is required');
    }

    if (location.pincode && !/^[0-9]{6}$/.test(location.pincode)) {
      throw new ValidationError('Invalid pincode format');
    }

    // Create job with enhanced data
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

    // Create and save job
    const job = new Job(jobData);
    await job.save();

    // Update user's job posting stats
    user.lastJobPostedAt = new Date();
    user.jobsPosted = (user.jobsPosted || 0) + 1;
    user.lastActivityAt = new Date();
    await user.save();

    // Add notification to user
    await user.addNotification(
      'job_posted',
      'Job Posted Successfully',
      `Your job "${job.title}" has been posted and is now visible to fixers.`
    );

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
    // Enhanced error handling
    if (error instanceof ValidationError || 
        error instanceof AuthenticationError || 
        error instanceof AuthorizationError) {
      throw error;
    }

    // Handle database errors
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      throw handleDatabaseError(error, 'job creation');
    }

    // Log and rethrow other errors
    console.error('Job posting error:', error);
    throw new DatabaseError('Failed to post job. Please try again.');
  }
});

// Enhanced GET endpoint for user's jobs
export const GET = withErrorHandling(async (request) => {
  try {
    // Apply security middleware
    const securityResponse = await withSecurity({
      rateLimitType: 'api_requests',
      maxAttempts: 100,
      windowMs: 15 * 60 * 1000
    })(request);

    if (securityResponse) {
      return securityResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AuthenticationError('Authentication required');
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'hirer') {
      throw new AuthorizationError('Only hirers can access this endpoint');
    }

    // Parse query parameters with validation
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit')) || 10), 50);
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate status parameter
    const validStatuses = ['open', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      throw new ValidationError('Invalid status parameter');
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

    // Execute query with error handling
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name username photoURL rating')
        .lean(),
      Job.countDocuments(query)
    ]);

    // Process jobs with enhanced data
    const jobsWithCounts = jobs.map(job => ({
      ...job,
      applicationCount: job.applications?.filter(app => app.status !== 'withdrawn').length || 0,
      timeRemaining: (() => {
        const now = new Date();
        const deadline = new Date(job.deadline);
        const diff = deadline - now;
        
        if (diff <= 0) return 'Expired';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days} days`;
        return `${hours} hours`;
      })(),
      isUrgent: (() => {
        const now = new Date();
        const deadline = new Date(job.deadline);
        const diff = deadline - now;
        return diff <= 24 * 60 * 60 * 1000; // Less than 24 hours
      })(),
      applications: undefined // Remove applications from response for privacy
    }));

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
    // Enhanced error handling
    if (error instanceof ValidationError || 
        error instanceof AuthenticationError || 
        error instanceof AuthorizationError) {
      throw error;
    }

    console.error('Get jobs error:', error);
    throw new DatabaseError('Failed to fetch jobs');
  }
});