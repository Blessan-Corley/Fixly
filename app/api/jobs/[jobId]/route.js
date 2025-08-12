// app/api/jobs/[jobId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function GET(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_details', 100, 60); // 100 requests per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
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

    // Note: Allow all authenticated users to view job details
    // Restriction on applying will be handled in the frontend based on canApplyToJob()

    // Fetch job with populated data
    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username photoURL rating location isVerified')
      .populate('assignedTo', 'name username photoURL rating')
      .populate('comments.author', 'name username photoURL')
      .populate('comments.replies.author', 'name username photoURL')
      .lean();

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user has applied to this job
    const hasApplied = job.applications?.some(
      app => app.fixer.toString() === user._id.toString() && app.status !== 'withdrawn'
    ) || false;

    // Check if user is involved in this job
    const isJobCreator = user._id.toString() === job.createdBy._id.toString();
    const isAssignedFixer = job.assignedTo && job.assignedTo._id.toString() === user._id.toString();
    const isInvolved = isJobCreator || isAssignedFixer || hasApplied;

    // Check if this is for application purposes
    const { searchParams } = new URL(request.url);
    const forApplication = searchParams.get('forApplication') === 'true';
    
    // Check if fixer can view full job details (has credits or is pro)
    // NOTE: Always allow full access for application purposes to prevent redirect loops
    const canViewFullDetails = user.role !== 'fixer' || 
                               user.plan?.type === 'pro' || 
                               (user.plan?.creditsUsed || 0) < 3 ||
                               isInvolved ||
                               forApplication; // Always allow full access for application purposes

    // **SECURITY: Hide sensitive contact details from non-involved fixers**
    let jobData = { ...job };
    
    if (user.role === 'fixer' && !canViewFullDetails) {
      // Restrict details for fixers without credits
      jobData = {
        _id: job._id,
        title: job.title,
        description: job.description.substring(0, 200) + '...', // Limited description
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
        restrictedView: true // Flag to indicate this is a restricted view
      };
    } else if (user.role === 'fixer') {
      // Privacy controls for fixers based on job status and involvement
      const jobCompleted = job.status === 'completed' && job.completion?.confirmedAt;
      const showContactInfo = isAssignedFixer && jobCompleted;
      
      // Hide sensitive information for fixers
      jobData.createdBy = {
        name: job.createdBy.name,
        username: job.createdBy.username,
        photoURL: job.createdBy.photoURL,
        rating: job.createdBy.rating,
        isVerified: job.createdBy.isVerified,
        location: {
          city: job.createdBy.location?.city,
          state: job.createdBy.location?.state
        }
      };
      
      // Only show contact details after job completion and confirmation
      if (showContactInfo) {
        jobData.createdBy.phone = job.createdBy.phone;
        jobData.createdBy.email = job.createdBy.email;
        jobData.location = job.location; // Full address after completion
      } else {
        // Hide exact address, only show city/state
        jobData.location = {
          city: job.location.city,
          state: job.location.state
        };
      }
      
      // Add privacy flag for frontend
      jobData.contactInfoRestricted = !showContactInfo;
    }
    
    // Privacy controls for hirers - hide fixer contact info until job completion
    if (user.role === 'hirer' && isJobCreator && job.assignedTo) {
      const jobCompleted = job.status === 'completed' && job.completion?.confirmedAt;
      
      if (!jobCompleted) {
        // Hide fixer contact details until job completion
        jobData.assignedTo = {
          ...jobData.assignedTo,
          phone: undefined,
          email: undefined,
          location: {
            city: jobData.assignedTo.location?.city,
            state: jobData.assignedTo.location?.state
          }
        };
      }
      
      jobData.fixerContactInfoRestricted = !jobCompleted;
    }

    // Calculate skill match for fixers
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

    // Check if it's a local job for the user
    const isLocalJob = user.location?.city?.toLowerCase() === 
                      job.location?.city?.toLowerCase();

    // Add application count
    const applicationCount = job.applications?.length || 0;

    // Include additional data
    if (!jobData.restrictedView) {
      jobData = {
        ...jobData,
        hasApplied,
        skillMatchPercentage,
        isLocalJob,
        applicationCount,
        canMessage: isInvolved, // Only involved parties can message
        
        // Remove sensitive application data unless user is job creator
        applications: isJobCreator ? job.applications : undefined
      };
    } else {
      // For restricted view, only add basic info
      jobData = {
        ...jobData,
        hasApplied: false,
        skillMatchPercentage: 0,
        isLocalJob: false,
        canMessage: false,
        canApply: false
      };
    }

    return NextResponse.json({
      job: jobData
    });

  } catch (error) {
    console.error('Get job details error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_update', 10, 60 * 60 * 1000); // 10 updates per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many update requests. Please try again later.' },
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

    // Check permissions - only job creator or admin can update
    if (job.createdBy.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'accept_application':
        return await acceptApplication(job, data.applicationId);
      
      case 'reject_application':
        return await rejectApplication(job, data.applicationId);
      
      case 'cancel_job':
        return await cancelJob(job, data.reason);
      
      case 'mark_completed':
        return await markJobCompleted(job, user, data);
      
      case 'update_details':
        return await updateJobDetails(job, data);
      
      case 'mark_in_progress':
        return await markJobInProgress(job, user);
        
      case 'confirm_progress':
        return await confirmJobProgress(job, user);
        
      case 'confirm_completion':
        return await confirmJobCompletion(job, user, data);
      
      case 'mark_arrived':
        return await markFixerArrived(job, user);
      
      default:
        return NextResponse.json(
          { message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Update job error:', error);
    return NextResponse.json(
      { message: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// Helper functions
async function acceptApplication(job, applicationId) {
  const application = job.applications.id(applicationId);
  if (!application) {
    return NextResponse.json(
      { message: 'Application not found' },
      { status: 404 }
    );
  }

  if (job.status !== 'open') {
    return NextResponse.json(
      { message: 'Job is not open for applications' },
      { status: 400 }
    );
  }

  // Accept the application
  application.status = 'accepted';
  job.assignedTo = application.fixer;
  job.status = 'in_progress';
  job.progress = {
    startedAt: new Date()
  };

  // Reject all other applications
  job.applications.forEach(app => {
    if (app._id.toString() !== applicationId.toString()) {
      app.status = 'rejected';
    }
  });

  await job.save();

  // Send notifications and deduct credits
  const fixer = await User.findById(application.fixer);
  if (fixer) {
    // Deduct credit for non-pro fixers when job is assigned
    if (fixer.plan.type !== 'pro') {
      fixer.plan.creditsUsed = (fixer.plan.creditsUsed || 0) + 1;
      await fixer.save();
    }

    await fixer.addNotification(
      'application_accepted',
      'Application Accepted! 🎉',
      `Your application for "${job.title}" has been accepted. The work can now begin. ${fixer.plan.type !== 'pro' ? 'One credit has been used.' : ''}`,
      { jobId: job._id }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Application accepted successfully',
    job: await Job.findById(job._id).populate('assignedTo', 'name username photoURL rating')
  });
}

async function rejectApplication(job, applicationId) {
  const application = job.applications.id(applicationId);
  if (!application) {
    return NextResponse.json(
      { message: 'Application not found' },
      { status: 404 }
    );
  }

  application.status = 'rejected';
  await job.save();

  // Send notification
  const fixer = await User.findById(application.fixer);
  if (fixer) {
    await fixer.addNotification(
      'application_rejected',
      'Application Update',
      `Your application for "${job.title}" was not selected. Keep applying to other opportunities!`,
      { jobId: job._id }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Application rejected'
  });
}

async function cancelJob(job, reason) {
  if (['completed', 'cancelled'].includes(job.status)) {
    return NextResponse.json(
      { message: 'Job cannot be cancelled in current status' },
      { status: 400 }
    );
  }

  job.status = 'cancelled';
  job.cancellation = {
    cancelled: true,
    cancelledBy: job.createdBy,
    reason: reason || 'No reason provided',
    cancelledAt: new Date()
  };

  await job.save();

  // Notify assigned fixer if any
  if (job.assignedTo) {
    const fixer = await User.findById(job.assignedTo);
    if (fixer) {
      await fixer.addNotification(
        'job_cancelled',
        'Job Cancelled',
        `The job "${job.title}" has been cancelled by the hirer.`,
        { jobId: job._id }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Job cancelled successfully'
  });
}

async function markJobCompleted(job, user, data) {
  if (job.status !== 'in_progress') {
    return NextResponse.json(
      { message: 'Job must be in progress to mark as completed' },
      { status: 400 }
    );
  }

  job.status = 'completed';
  job.progress.completedAt = new Date();
  
  if (data.notes) {
    job.completion = {
      ...job.completion,
      completionNotes: data.notes,
      markedDoneBy: user._id,
      markedDoneAt: new Date()
    };
  }

  await job.save();

  // Update fixer's stats
  if (job.assignedTo) {
    const fixer = await User.findById(job.assignedTo);
    if (fixer) {
      fixer.jobsCompleted = (fixer.jobsCompleted || 0) + 1;
      if (job.budget.amount) {
        fixer.totalEarnings = (fixer.totalEarnings || 0) + job.budget.amount;
      }
      await fixer.save();

      await fixer.addNotification(
        'job_completed',
        'Job Completed! 💰',
        `The job "${job.title}" has been marked as completed. Well done!`,
        { jobId: job._id }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Job marked as completed'
  });
}

async function updateJobDetails(job, data) {
  if (job.status !== 'open') {
    return NextResponse.json(
      { message: 'Only open jobs can be edited' },
      { status: 400 }
    );
  }

  const allowedFields = [
    'title', 
    'description', 
    'budget', 
    'deadline', 
    'urgency', 
    'skillsRequired',
    'location',
    'type',
    'experienceLevel',
    'scheduledDate',
    'estimatedDuration'
  ];
  const updateData = {};

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  });

  // Validate required fields
  if (data.title && data.title.length < 10) {
    return NextResponse.json(
      { message: 'Title must be at least 10 characters' },
      { status: 400 }
    );
  }

  if (data.description && data.description.length < 30) {
    return NextResponse.json(
      { message: 'Description must be at least 30 characters' },
      { status: 400 }
    );
  }

  if (data.deadline && new Date(data.deadline) <= new Date()) {
    return NextResponse.json(
      { message: 'Deadline must be in the future' },
      { status: 400 }
    );
  }

  await Job.findByIdAndUpdate(job._id, updateData);

  return NextResponse.json({
    success: true,
    message: 'Job updated successfully'
  });
}

async function markJobInProgress(job, user) {
  // Only assigned fixer can mark as in progress
  if (!job.assignedTo || job.assignedTo.toString() !== user._id.toString()) {
    return NextResponse.json(
      { message: 'Only the assigned fixer can mark job as in progress' },
      { status: 403 }
    );
  }

  if (job.status !== 'in_progress') {
    return NextResponse.json(
      { message: 'Job must be in progress status' },
      { status: 400 }
    );
  }

  // Update progress tracking
  if (!job.progress.startedAt) {
    job.progress.startedAt = new Date();
  }
  
  await job.save();

  // Notify the hirer
  const hirer = await User.findById(job.createdBy);
  if (hirer) {
    await hirer.addNotification(
      'job_in_progress',
      'Work Started! 🚀',
      `${user.name} has started working on "${job.title}". You can track progress and communicate with them.`,
      { jobId: job._id }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Job marked as in progress'
  });
}

async function confirmJobProgress(job, user) {
  // Only hirer can confirm progress
  if (job.createdBy.toString() !== user._id.toString()) {
    return NextResponse.json(
      { message: 'Only the job creator can confirm progress' },
      { status: 403 }
    );
  }

  if (job.status !== 'in_progress') {
    return NextResponse.json(
      { message: 'Job must be in progress' },
      { status: 400 }
    );
  }

  // Update progress confirmation
  job.progress.confirmedAt = new Date();
  await job.save();

  // Notify the fixer
  const fixer = await User.findById(job.assignedTo);
  if (fixer) {
    await fixer.addNotification(
      'progress_confirmed',
      'Progress Confirmed! ✅',
      `The client has confirmed your progress on "${job.title}". Keep up the great work!`,
      { jobId: job._id }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Progress confirmed successfully'
  });
}

async function confirmJobCompletion(job, user, data) {
  // Only hirer can confirm completion
  if (job.createdBy.toString() !== user._id.toString()) {
    return NextResponse.json(
      { message: 'Only the job creator can confirm completion' },
      { status: 403 }
    );
  }

  if (job.status !== 'completed') {
    return NextResponse.json(
      { message: 'Job must be marked as completed by fixer first' },
      { status: 400 }
    );
  }

  // Update completion confirmation
  job.completion.confirmedBy = user._id;
  job.completion.confirmedAt = new Date();
  
  if (data.rating) {
    job.completion.rating = data.rating;
  }
  
  if (data.review) {
    job.completion.review = data.review;
  }
  
  await job.save();

  // Update fixer's rating if rating was provided
  if (data.rating && job.assignedTo) {
    const fixer = await User.findById(job.assignedTo);
    if (fixer) {
      await fixer.updateRating(data.rating);
      
      await fixer.addNotification(
        'job_confirmed',
        'Job Completed & Confirmed! 🎉',
        `Your work on "${job.title}" has been confirmed by the client. ${data.rating ? `You received a ${data.rating}-star rating!` : ''} Payment will be processed soon.`,
        { jobId: job._id, rating: data.rating }
      );
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Job completion confirmed successfully'
  });
}

async function markFixerArrived(job, user) {
  // Only assigned fixer can mark arrival
  if (!job.assignedTo || job.assignedTo.toString() !== user._id.toString()) {
    return NextResponse.json(
      { message: 'Only the assigned fixer can mark arrival' },
      { status: 403 }
    );
  }

  if (job.status !== 'in_progress') {
    return NextResponse.json(
      { message: 'Job must be in progress to mark arrival' },
      { status: 400 }
    );
  }

  if (job.progress?.arrivedAt) {
    return NextResponse.json(
      { message: 'Arrival already marked' },
      { status: 400 }
    );
  }

  // Update arrival tracking
  job.progress.arrivedAt = new Date();
  await job.save();

  // Notify the hirer
  const hirer = await User.findById(job.createdBy);
  if (hirer) {
    await hirer.addNotification(
      'fixer_arrived',
      'Fixer Has Arrived! 📍',
      `${user.name} has arrived at your location for "${job.title}". They should be starting work soon.`,
      { jobId: job._id }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Arrival confirmed successfully'
  });
}

// DELETE method to delete a job
export async function DELETE(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_delete', 5, 60 * 60 * 1000); // 5 deletes per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many delete requests. Please try again later.' },
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

    // Check permissions - only job creator or admin can delete
    if (job.createdBy.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Permission denied. Only job creator can delete this job.' },
        { status: 403 }
      );
    }

    // Only allow deletion for certain statuses
    if (!['open', 'expired', 'cancelled'].includes(job.status)) {
      return NextResponse.json(
        { message: 'Jobs in progress or completed cannot be deleted' },
        { status: 400 }
      );
    }

    // Delete the job
    await Job.findByIdAndDelete(jobId);

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { message: 'Failed to delete job' },
      { status: 500 }
    );
  }
}