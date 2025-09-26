// app/api/jobs/[jobId]/status/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';
import { sendWorkStatusMessage, sendDisputeMessage } from '../../../../../lib/services/automatedMessaging';

export const dynamic = 'force-dynamic';

// Job status transition rules
const VALID_TRANSITIONS = {
  open: ['in_progress', 'cancelled', 'expired'],
  in_progress: ['completed', 'cancelled', 'disputed'],
  completed: ['disputed'], // Only disputes can reopen completed jobs
  cancelled: [], // No transitions from cancelled
  disputed: ['in_progress', 'completed', 'cancelled'],
  expired: ['open'] // Can be reopened
};

// User permissions for status changes
const STATUS_PERMISSIONS = {
  open: ['hirer'], // Only hirer can cancel or assign
  in_progress: ['hirer', 'fixer'], // Both can update progress
  completed: ['fixer'], // Fixer marks as completed
  cancelled: ['hirer'], // Only hirer can cancel
  disputed: ['hirer', 'fixer'], // Either can dispute
  expired: ['hirer'] // Hirer can reopen expired jobs
};

export async function PUT(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_status_update', 10, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many status update requests. Please try again later.' },
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

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('applications.fixer', 'name email');

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      newStatus, 
      reason, 
      assignedFixerId, 
      completionNotes, 
      disputeReason,
      additionalData 
    } = body;

    if (!newStatus) {
      return NextResponse.json(
        { message: 'New status is required' },
        { status: 400 }
      );
    }

    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    if (!VALID_TRANSITIONS[job.status] || !VALID_TRANSITIONS[job.status].includes(newStatus)) {
      return NextResponse.json(
        { message: `Cannot change status from ${job.status} to ${newStatus}` },
        { status: 400 }
      );
    }

    // Check user permissions
    const isJobCreator = job.createdBy._id.toString() === currentUser._id.toString();
    const isAssignedFixer = job.assignedTo && job.assignedTo._id.toString() === currentUser._id.toString();
    
    if (!isJobCreator && !isAssignedFixer) {
      return NextResponse.json(
        { message: 'You do not have permission to update this job status' },
        { status: 403 }
      );
    }

    // Validate user role permissions for the new status
    const allowedRoles = STATUS_PERMISSIONS[newStatus] || [];
    if (!allowedRoles.includes(currentUser.role)) {
      return NextResponse.json(
        { message: `Your role (${currentUser.role}) cannot set status to ${newStatus}` },
        { status: 403 }
      );
    }

    // Handle specific status transitions
    let updateData = {
      status: newStatus,
      lastStatusUpdate: new Date(),
      statusHistory: [
        ...job.statusHistory || [],
        {
          status: newStatus,
          changedBy: currentUser._id,
          changedAt: new Date(),
          reason: reason || '',
          additionalData: additionalData || {}
        }
      ]
    };

    switch (newStatus) {
      case 'in_progress':
        // Send work started message if job was already assigned
        if (job.assignedTo && !assignedFixerId) {
          setTimeout(() => {
            sendWorkStatusMessage(jobId, 'in_progress').catch(console.error);
          }, 1000);
        }

        // Assign job to fixer if specified
        if (assignedFixerId) {
          const fixer = await User.findById(assignedFixerId);
          if (!fixer || fixer.role !== 'fixer') {
            return NextResponse.json(
              { message: 'Invalid fixer selected' },
              { status: 400 }
            );
          }
          
          // Check if fixer has applied
          const application = job.applications.find(
            app => app.fixer._id.toString() === assignedFixerId
          );
          
          if (!application) {
            return NextResponse.json(
              { message: 'Fixer must have applied to the job to be assigned' },
              { status: 400 }
            );
          }

          updateData.assignedTo = assignedFixerId;
          updateData.assignedAt = new Date();
          updateData.acceptedApplication = application._id;
          
          // Update application status to accepted
          job.applications.forEach(app => {
            if (app._id.toString() === application._id.toString()) {
              app.status = 'accepted';
              app.acceptedAt = new Date();
            } else if (app.status === 'pending') {
              app.status = 'rejected';
              app.rejectedAt = new Date();
            }
          });

          // Add notifications
          await fixer.addNotification(
            'job_assigned',
            'Job Assigned to You! 🎉',
            `You've been assigned to "${job.title}". Start working and keep the client updated!`,
            {
              jobId: job._id,
              hirerId: job.createdBy._id
            }
          );

          // Job assignment message already sent by MessageService.createJobConversation()
          // in applications route - no need to duplicate
        }
        break;

      case 'completed':
        if (!isAssignedFixer) {
          return NextResponse.json(
            { message: 'Only the assigned fixer can mark job as completed' },
            { status: 403 }
          );
        }
        
        updateData.completedAt = new Date();
        updateData.completionNotes = completionNotes || '';
        
        // Add notification to hirer
        await job.createdBy.addNotification(
          'job_completed',
          'Job Completed! ✅',
          `${currentUser.name} has marked "${job.title}" as completed. Please review and release payment.`,
          {
            jobId: job._id,
            fixerId: currentUser._id
          }
        );

        // Send automated messaging
        setTimeout(() => {
          sendWorkStatusMessage(jobId, 'completed').catch(console.error);
          // No payment reminders - users handle payment directly
        }, 1000);
        break;

      case 'cancelled':
        if (!isJobCreator) {
          return NextResponse.json(
            { message: 'Only the job creator can cancel the job' },
            { status: 403 }
          );
        }
        
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = reason || '';
        
        // Notify assigned fixer if any
        if (job.assignedTo) {
          await job.assignedTo.addNotification(
            'job_cancelled',
            'Job Cancelled ❌',
            `The job "${job.title}" has been cancelled by the client.`,
            {
              jobId: job._id,
              hirerId: job.createdBy._id,
              reason: reason || 'No reason provided'
            }
          );
        }
        break;

      case 'disputed':
        updateData.disputedAt = new Date();
        updateData.disputeReason = disputeReason || '';
        updateData.disputeInitiatedBy = currentUser._id;
        
        // Notify the other party
        const otherParty = isJobCreator ? job.assignedTo : job.createdBy;
        if (otherParty) {
          await otherParty.addNotification(
            'job_disputed',
            'Job Dispute Initiated ⚠️',
            `A dispute has been raised for "${job.title}". Our support team will review this case.`,
            {
              jobId: job._id,
              disputeInitiatedBy: currentUser._id,
              reason: disputeReason || 'No reason provided'
            }
          );
        }

        // Send automated dispute messaging
        setTimeout(() => {
          sendDisputeMessage(jobId).catch(console.error);
        }, 1000);
        break;

      case 'expired':
        // This is usually automatic, but can be manually set
        updateData.expiredAt = new Date();
        break;
    }

    // Update the job
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      updateData,
      { new: true, runValidators: true }
    );

    // Update user statistics
    if (newStatus === 'completed' && job.assignedTo) {
      await User.findByIdAndUpdate(job.assignedTo._id, {
        $inc: { 
          jobsCompleted: 1,
          totalEarnings: job.budget?.amount || 0
        }
      });
      
      await User.findByIdAndUpdate(job.createdBy._id, {
        $inc: { 
          jobsPosted: 1,
          totalSpent: job.budget?.amount || 0
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Job status updated to ${newStatus}`,
      job: {
        _id: updatedJob._id,
        status: updatedJob.status,
        assignedTo: updatedJob.assignedTo,
        lastStatusUpdate: updatedJob.lastStatusUpdate
      }
    });

  } catch (error) {
    console.error('Job status update error:', error);
    return NextResponse.json(
      { message: 'Failed to update job status' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    await connectDB();

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .select('status statusHistory lastStatusUpdate assignedTo createdBy')
      .lean();

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this job
    const currentUser = await User.findById(session.user.id);
    const isJobCreator = job.createdBy._id.toString() === currentUser._id.toString();
    const isAssignedFixer = job.assignedTo && job.assignedTo._id.toString() === currentUser._id.toString();
    
    if (!isJobCreator && !isAssignedFixer) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    // Get available actions based on current status and user role
    const availableActions = getAvailableActions(job.status, currentUser.role, isJobCreator, isAssignedFixer);

    return NextResponse.json({
      success: true,
      status: job.status,
      statusHistory: job.statusHistory || [],
      lastStatusUpdate: job.lastStatusUpdate,
      availableActions,
      assignedTo: job.assignedTo
    });

  } catch (error) {
    console.error('Get job status error:', error);
    return NextResponse.json(
      { message: 'Failed to get job status' },
      { status: 500 }
    );
  }
}

function getAvailableActions(currentStatus, userRole, isJobCreator, isAssignedFixer) {
  const actions = [];

  if (isJobCreator) {
    switch (currentStatus) {
      case 'open':
        actions.push(
          { action: 'assign', label: 'Assign to Fixer', requiresData: ['fixerId'] },
          { action: 'cancel', label: 'Cancel Job', requiresData: ['reason'] }
        );
        break;
      case 'in_progress':
        actions.push(
          { action: 'cancel', label: 'Cancel Job', requiresData: ['reason'] },
          { action: 'dispute', label: 'Raise Dispute', requiresData: ['disputeReason'] }
        );
        break;
      case 'completed':
        actions.push(
          { action: 'dispute', label: 'Raise Dispute', requiresData: ['disputeReason'] }
        );
        break;
      case 'expired':
        actions.push(
          { action: 'reopen', label: 'Reopen Job', requiresData: [] }
        );
        break;
    }
  }

  if (isAssignedFixer) {
    switch (currentStatus) {
      case 'in_progress':
        actions.push(
          { action: 'complete', label: 'Mark as Completed', requiresData: ['completionNotes'] },
          { action: 'dispute', label: 'Raise Dispute', requiresData: ['disputeReason'] }
        );
        break;
      case 'completed':
        actions.push(
          { action: 'dispute', label: 'Raise Dispute', requiresData: ['disputeReason'] }
        );
        break;
    }
  }

  return actions;
}