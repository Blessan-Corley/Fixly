// app/api/jobs/[jobId]/applications/withdraw/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../../lib/db';
import Job from '../../../../../../models/Job';

export const dynamic = 'force-dynamic';

// Withdraw application
export async function POST(request, { params }) {
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

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Find user's application
    const applicationIndex = job.applications.findIndex(
      app => app.fixer.toString() === session.user.id && app.status === 'pending'
    );

    if (applicationIndex === -1) {
      return NextResponse.json(
        { message: 'No pending application found' },
        { status: 404 }
      );
    }

    // Remove the application
    job.applications.splice(applicationIndex, 1);
    await job.save({ validateBeforeSave: false });

    return NextResponse.json({
      success: true,
      message: 'Application withdrawn successfully'
    });

  } catch (error) {
    console.error('Withdraw application error:', error);
    return NextResponse.json(
      { message: 'Failed to withdraw application' },
      { status: 500 }
    );
  }
}