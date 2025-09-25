import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
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
      .populate('createdBy', 'name username photoURL')
      .populate('assignedTo', 'name username photoURL');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized
    const isHirer = job.createdBy._id.toString() === userId;
    const isFixer = job.assignedTo && job.assignedTo._id.toString() === userId;

    if (!isHirer && !isFixer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get review status for UI
    const reviewStatus = job.getReviewStatusForUI(userId);

    // Get job participants
    const participants = job.getJobParticipants();

    // Get existing reviews data
    const reviews = {
      hirer: job.completion.hirerRating ? {
        rating: job.completion.hirerRating.rating,
        comment: job.completion.hirerRating.review,
        categories: job.completion.hirerRating.categories,
        submittedAt: job.completion.hirerRating.ratedAt,
        submittedBy: job.completion.hirerRating.ratedBy
      } : null,
      fixer: job.completion.fixerRating ? {
        rating: job.completion.fixerRating.rating,
        comment: job.completion.fixerRating.review,
        categories: job.completion.fixerRating.categories,
        submittedAt: job.completion.fixerRating.ratedAt,
        submittedBy: job.completion.fixerRating.ratedBy
      } : null
    };

    return NextResponse.json({
      success: true,
      reviewStatus,
      participants,
      reviews,
      job: {
        id: job._id,
        title: job.title,
        status: job.status,
        completedAt: job.completion.confirmedAt,
        messagingClosed: job.completion.messagingClosed,
        messagingClosedAt: job.completion.messagingClosedAt,
        reviewMessagesSent: job.completion.reviewMessagesSent
      }
    });

  } catch (error) {
    console.error('Review status error:', error);
    return NextResponse.json(
      { error: 'Failed to get review status' },
      { status: 500 }
    );
  }
}