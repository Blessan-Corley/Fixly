// app/api/jobs/[jobId]/applications/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';
import { MessageService } from '../../../../../lib/services/messageService';
import { getServerAbly, CHANNELS, EVENTS } from '../../../../../lib/ably';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Get applications for a job (client only)
export async function GET(request, { params }) {
  try {
    const rateLimitResult = await rateLimit(request, 'applications', 100, 60 * 1000);
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

    const { jobId } = params;

    await connectDB();

    // First check if job exists and user has permission (without populating)
    const job = await Job.findById(jobId).select('createdBy applications').lean();

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user is the job creator (using createdBy instead of client)
    if (job.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'Only job creator can view applications' },
        { status: 403 }
      );
    }

    // Only populate applications AFTER authorization check
    // Use aggregation pipeline for better performance with many applications
    const jobWithApps = await Job.findById(jobId)
      .select('applications')
      .populate({
        path: 'applications.fixer',
        select: 'name username photoURL rating skillsAndExperience location',
        options: { lean: true }
      })
      .lean();

    return NextResponse.json({
      success: true,
      applications: jobWithApps?.applications || []
    });

  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// Update application status (accept/reject)
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    const { applicationId, status, message } = await request.json();

    if (!applicationId || !status || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { message: 'Application ID and valid status are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user is the job client
    if (job.client.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'Only job client can update applications' },
        { status: 403 }
      );
    }

    // Find the application
    const application = job.applications.id(applicationId);
    if (!application) {
      return NextResponse.json(
        { message: 'Application not found' },
        { status: 404 }
      );
    }

    // Update application status
    application.status = status;
    application.responseMessage = message;
    application.respondedAt = new Date();

    // If accepted, use transaction to ensure atomicity (job + credit deduction)
    if (status === 'accepted') {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        job.fixer = application.fixer;
        job.status = 'in_progress';
        job.acceptedApplication = applicationId;

        // Check if fixer can be assigned (credit check) and deduct credit
        const acceptedFixer = await User.findById(application.fixer).session(session);
        if (!acceptedFixer) {
          await session.abortTransaction();
          session.endSession();
          return NextResponse.json(
            { message: 'Fixer not found' },
            { status: 404 }
          );
        }

        if (!acceptedFixer.canBeAssignedJob()) {
          await session.abortTransaction();
          session.endSession();
          return NextResponse.json(
            { message: 'Selected fixer has reached their job limit. Please select another applicant.' },
            { status: 400 }
          );
        }

        // Deduct credit for the accepted fixer (only when application is accepted)
        if (acceptedFixer && acceptedFixer.plan?.type !== 'pro') {
          if (!acceptedFixer.plan) {
            acceptedFixer.plan = { type: 'free', creditsUsed: 0, status: 'active' };
          }
          acceptedFixer.plan.creditsUsed = (acceptedFixer.plan.creditsUsed || 0) + 1;
          await acceptedFixer.save({ session });
        }

        // Reject other applications
        job.applications.forEach(app => {
          if (app._id.toString() !== applicationId && app.status === 'pending') {
            app.status = 'rejected';
            app.responseMessage = 'Another applicant was selected';
            app.respondedAt = new Date();
          }
        });

        // Save job with transaction
        await job.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

      } catch (transactionError) {
        // Rollback transaction on error
        await session.abortTransaction();
        session.endSession();
        console.error('Transaction error:', transactionError);
        return NextResponse.json(
          { message: 'Failed to update application. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // For non-accepted status, just save normally
      await job.save();
    }

    // If application accepted, create private conversation with automated message
    if (status === 'accepted') {
      try {
        await MessageService.createJobConversation(
          jobId,
          session.user.id, // hirer
          application.fixer.toString() // fixer
        );
        console.log(`✅ Private conversation created for job ${jobId}`);
      } catch (conversationError) {
        console.error('Failed to create private conversation:', conversationError);
        // Don't fail the application acceptance if conversation creation fails
      }

      // Real-time broadcast job assignment via Ably
      try {
        const ably = getServerAbly();
        if (ably) {
          // Broadcast to job-specific channel
          const jobChannel = ably.channels.get(CHANNELS.jobUpdates(jobId));
          await jobChannel.publish(EVENTS.JOB_ASSIGNED, {
            jobId,
            fixerId: application.fixer.toString(),
            hirerId: session.user.id,
            status: 'assigned',
            timestamp: new Date().toISOString()
          });

          // Broadcast to fixer's notifications
          const fixerChannel = ably.channels.get(CHANNELS.userNotifications(application.fixer.toString()));
          await fixerChannel.publish(EVENTS.JOB_ASSIGNED, {
            jobId,
            jobTitle: job.title,
            hirerName: session.user.name,
            message: 'Congratulations! You\'ve been assigned to this job.',
            actionUrl: `/dashboard/messages?job=${jobId}`,
            timestamp: new Date().toISOString()
          });
        }
      } catch (ablyError) {
        console.error('Failed to broadcast job assignment:', ablyError);
      }
    }

    // Create notifications
    try {
      // Notify the applicant
      await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: application.fixer,
          type: 'job_application',
          title: `Application ${status}`,
          message: `Your application for "${job.title}" has been ${status}`,
          actionUrl: `/dashboard/applications`,
          data: {
            jobId,
            applicationId,
            status
          }
        }),
      });

      // If accepted, notify other applicants
      if (status === 'accepted') {
        const rejectedApplications = job.applications.filter(
          app => app._id.toString() !== applicationId && app.status === 'rejected'
        );

        for (const app of rejectedApplications) {
          await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: app.fixer,
              type: 'job_application',
              title: 'Application Update',
              message: `Another applicant was selected for "${job.title}"`,
              actionUrl: `/dashboard/applications`,
              data: {
                jobId,
                applicationId: app._id,
                status: 'rejected'
              }
            }),
          });
        }
      }
    } catch (error) {
      console.error('Failed to create notifications:', error);
    }

    return NextResponse.json({
      success: true,
      message: `Application ${status} successfully`
    });

  } catch (error) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { message: 'Failed to update application' },
      { status: 500 }
    );
  }
}