// app/api/jobs/[jobId]/applications/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

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

    const job = await Job.findById(jobId)
      .populate('applications.fixer', 'name username photoURL rating skillsAndExperience')
      .lean();

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user is the job client
    if (job.client.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'Only job client can view applications' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      applications: job.applications || []
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

    // If accepted, assign fixer and reject other applications
    if (status === 'accepted') {
      job.fixer = application.fixer;
      job.status = 'in_progress';
      job.acceptedApplication = applicationId;
      
      // Deduct credit for the accepted fixer (only when application is accepted)
      const acceptedFixer = await User.findById(application.fixer);
      if (acceptedFixer && acceptedFixer.plan?.type !== 'pro') {
        if (!acceptedFixer.plan) {
          acceptedFixer.plan = { type: 'free', creditsUsed: 0, status: 'active' };
        }
        acceptedFixer.plan.creditsUsed = (acceptedFixer.plan.creditsUsed || 0) + 1;
        await acceptedFixer.save();
      }
      
      // Reject other applications
      job.applications.forEach(app => {
        if (app._id.toString() !== applicationId && app.status === 'pending') {
          app.status = 'rejected';
          app.responseMessage = 'Another applicant was selected';
          app.respondedAt = new Date();
        }
      });
    }

    await job.save();

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