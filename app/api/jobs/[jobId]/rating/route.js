// app/api/jobs/[jobId]/rating/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';

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
    const body = await request.json();
    const { rating, review, categories, ratedBy } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: 'Rating must be between 1 and 5' },
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

    // Only allow rating after job completion
    if (job.status !== 'completed') {
      return NextResponse.json(
        { message: 'Job must be completed before rating' },
        { status: 400 }
      );
    }

    // Check if user is involved in this job
    const isHirer = job.createdBy.toString() === user._id.toString();
    const isFixer = job.assignedTo && job.assignedTo.toString() === user._id.toString();

    if (!isHirer && !isFixer) {
      return NextResponse.json(
        { message: 'Only job participants can rate' },
        { status: 403 }
      );
    }

    // Determine who is being rated
    let ratedUserId;
    let ratingField;
    
    if (isHirer && ratedBy === 'hirer') {
      // Hirer rating fixer
      ratedUserId = job.assignedTo;
      ratingField = 'fixerRating';
    } else if (isFixer && ratedBy === 'fixer') {
      // Fixer rating hirer
      ratedUserId = job.createdBy;
      ratingField = 'hirerRating';
    } else {
      return NextResponse.json(
        { message: 'Invalid rating configuration' },
        { status: 400 }
      );
    }

    // Check if already rated
    if (job.completion && job.completion[ratingField]) {
      return NextResponse.json(
        { message: 'You have already rated for this job' },
        { status: 400 }
      );
    }

    // Add rating to job
    if (!job.completion) {
      job.completion = {};
    }
    
    job.completion[ratingField] = {
      rating,
      review: review || '',
      categories: categories || {},
      ratedBy: user._id,
      ratedAt: new Date()
    };

    await job.save();

    // Update the rated user's overall rating
    const ratedUser = await User.findById(ratedUserId);
    if (ratedUser) {
      await ratedUser.updateRating(rating);
      
      // Add notification
      const raterName = user.name;
      const stars = '⭐'.repeat(rating);
      await ratedUser.addNotification(
        'rating_received',
        `New ${rating}-Star Rating! ${stars}`,
        `${raterName} rated you ${rating} stars for "${job.title}". ${review ? `"${review.substring(0, 50)}..."` : ''}`,
        { jobId: job._id, rating, fromUser: user._id }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully'
    });

  } catch (error) {
    console.error('Rating submission error:', error);
    return NextResponse.json(
      { message: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}