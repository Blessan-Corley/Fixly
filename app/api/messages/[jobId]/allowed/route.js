import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';

export async function GET(request, { params }) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    const userId = session.user.id;

    // Find the job
    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username')
      .populate('assignedTo', 'name username');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to message
    const isHirer = job.createdBy._id.toString() === userId;
    const isFixer = job.assignedTo && job.assignedTo._id.toString() === userId;

    if (!isHirer && !isFixer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if messaging is allowed
    const messagingAllowed = job.isMessagingAllowed();
    const reviewStatus = job.getReviewStatusForUI(userId);

    return NextResponse.json({
      success: true,
      messagingAllowed,
      messagingClosed: job.completion.messagingClosed,
      messagingClosedAt: job.completion.messagingClosedAt,
      reason: !messagingAllowed ? 'Reviews completed' : null,
      job: {
        id: job._id,
        title: job.title,
        status: job.status
      },
      reviewStatus
    });

  } catch (error) {
    console.error('Messaging allowed check error:', error);
    return NextResponse.json(
      { error: 'Failed to check messaging status' },
      { status: 500 }
    );
  }
}