// app/api/reviews/[reviewId]/helpful/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Review from '../../../../../models/Review';

export const dynamic = 'force-dynamic';

// Toggle helpful vote for a review
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { reviewId } = params;

    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user already voted
    const hasVoted = review.helpfulVotes.users.includes(session.user.id);
    
    if (hasVoted) {
      // Remove vote
      await review.removeHelpfulVote(session.user.id);
      return NextResponse.json({
        success: true,
        action: 'removed',
        helpfulCount: review.helpfulVotes.count
      });
    } else {
      // Add vote
      await review.markAsHelpful(session.user.id);
      return NextResponse.json({
        success: true,
        action: 'added',
        helpfulCount: review.helpfulVotes.count
      });
    }

  } catch (error) {
    console.error('Toggle helpful vote error:', error);
    return NextResponse.json(
      { message: 'Failed to toggle helpful vote' },
      { status: 500 }
    );
  }
}