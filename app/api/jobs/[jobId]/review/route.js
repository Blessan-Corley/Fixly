// app/api/jobs/[jobId]/review/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'submit_review', 5, 60 * 60 * 1000); // 5 reviews per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many review submissions. Please try again later.' },
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
    const body = await request.json();
    const { rating, review, reviewType } = body; // reviewType: 'hirer_to_fixer' or 'fixer_to_hirer'

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (review && review.length > 1000) {
      return NextResponse.json(
        { message: 'Review must be less than 1000 characters' },
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

    // Only allow reviews for completed jobs
    if (job.status !== 'completed') {
      return NextResponse.json(
        { message: 'Can only review completed jobs' },
        { status: 400 }
      );
    }

    const user = await User.findById(session.user.id);
    let revieweeId;
    let reviewerRole;

    // Determine who is being reviewed
    if (reviewType === 'hirer_to_fixer') {
      // Hirer reviewing fixer
      if (job.createdBy.toString() !== user._id.toString()) {
        return NextResponse.json(
          { message: 'Only job creator can review the fixer' },
          { status: 403 }
        );
      }
      revieweeId = job.assignedTo;
      reviewerRole = 'hirer';
    } else if (reviewType === 'fixer_to_hirer') {
      // Fixer reviewing hirer
      if (job.assignedTo.toString() !== user._id.toString()) {
        return NextResponse.json(
          { message: 'Only assigned fixer can review the hirer' },
          { status: 403 }
        );
      }
      revieweeId = job.createdBy;
      reviewerRole = 'fixer';
    } else {
      return NextResponse.json(
        { message: 'Invalid review type' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReviewField = reviewType === 'hirer_to_fixer' ? 'completion.hirerReview' : 'completion.fixerReview';
    if (job.completion && job.completion[existingReviewField.split('.')[1]]) {
      return NextResponse.json(
        { message: 'Review already submitted' },
        { status: 400 }
      );
    }

    // Add review to job
    if (!job.completion) {
      job.completion = {};
    }

    if (reviewType === 'hirer_to_fixer') {
      job.completion.hirerReview = {
        rating,
        review: review || '',
        reviewedAt: new Date(),
        reviewedBy: user._id
      };
    } else {
      job.completion.fixerReview = {
        rating,
        review: review || '',
        reviewedAt: new Date(),
        reviewedBy: user._id
      };
    }

    await job.save();

    // Update reviewee's rating
    const reviewee = await User.findById(revieweeId);
    if (reviewee) {
      await reviewee.updateRating(rating);
      
      // Add notification
      await reviewee.addNotification(
        'review_received',
        'New Review Received',
        `You received a ${rating}-star review for "${job.title}". ${review ? 'Read the full review in your dashboard.' : ''}`,
        {
          jobId: job._id,
          rating,
          reviewerName: user.name
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        rating,
        review: review || '',
        reviewedAt: new Date(),
        reviewerName: user.name
      }
    });

  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json(
      { message: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { jobId } = params;

    await connectDB();

    const job = await Job.findById(jobId)
      .populate('completion.hirerReview.reviewedBy', 'name username photoURL')
      .populate('completion.fixerReview.reviewedBy', 'name username photoURL')
      .select('completion createdBy assignedTo status');

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    const reviews = {
      hirerReview: job.completion?.hirerReview || null,
      fixerReview: job.completion?.fixerReview || null
    };

    return NextResponse.json({ reviews });

  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}