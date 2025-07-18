// app/api/jobs/[jobId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
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

    // Prepare job data for response
    const jobData = {
      ...job,
      hasApplied,
      skillMatchPercentage,
      isLocalJob,
      applicationCount,
      // Remove sensitive application data unless user is job creator
      applications: user._id.toString() === job.createdBy._id.toString() 
        ? job.applications 
        : undefined
    };

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

  // Send notifications
  const fixer = await User.findById(application.fixer);
  if (fixer) {
    await fixer.addNotification(
      'application_accepted',
      'Application Accepted! 🎉',
      `Your application for "${job.title}" has been accepted. The work can now begin.`,
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

  const allowedFields = ['title', 'description', 'budget', 'deadline', 'urgency'];
  const updateData = {};

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  });

  await Job.findByIdAndUpdate(job._id, updateData);

  return NextResponse.json({
    success: true,
    message: 'Job updated successfully'
  });
}