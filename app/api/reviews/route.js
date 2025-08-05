// app/api/reviews/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../lib/db';
import Review from '../../../models/Review';
import Job from '../../../models/Job';
import User from '../../../models/User';
import { rateLimit } from '../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

// Get reviews
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'reviews', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jobId = searchParams.get('jobId');
    const reviewType = searchParams.get('reviewType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query = {
      status: 'published',
      isPublic: true
    };

    if (userId) query.reviewee = userId;
    if (jobId) query.job = jobId;
    if (reviewType) query.reviewType = reviewType;

    const skip = (page - 1) * limit;

    // Get reviews with populated data
    const reviews = await Review.find(query)
      .populate('reviewer', 'name username photoURL role rating')
      .populate('reviewee', 'name username photoURL role rating')
      .populate('job', 'title category budget status')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalReviews = await Review.countDocuments(query);

    // Get rating statistics if userId is provided
    let ratingStats = null;
    if (userId) {
      ratingStats = await Review.getAverageRating(userId);
      
      // Get detailed ratings breakdown
      const clientToFixerStats = await Review.getDetailedRatings(userId, 'client_to_fixer');
      const fixerToClientStats = await Review.getDetailedRatings(userId, 'fixer_to_client');
      
      ratingStats.detailed = {
        asFixel: clientToFixerStats,
        asClient: fixerToClientStats
      };
    }

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasMore: skip + reviews.length < totalReviews
      },
      ratingStats
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// Create a new review
export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'create_review', 5, 60 * 1000);
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

    const {
      jobId,
      revieweeId,
      reviewType,
      rating,
      title,
      comment,
      pros = [],
      cons = [],
      tags = [],
      wouldRecommend = true,
      wouldHireAgain,
      attachments = []
    } = await request.json();

    // Validation
    if (!jobId || !revieweeId || !reviewType || !rating?.overall || !title || !comment) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating.overall < 1 || rating.overall > 5) {
      return NextResponse.json(
        { message: 'Overall rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (title.length > 100 || comment.length > 1000) {
      return NextResponse.json(
        { message: 'Title or comment too long' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify job exists and user is involved
    const job = await Job.findById(jobId).populate('client fixer');
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        { message: 'Can only review completed jobs' },
        { status: 400 }
      );
    }

    // Verify user relationship to job
    const isClient = job.client._id.toString() === session.user.id;
    const isFixer = job.fixer && job.fixer._id.toString() === session.user.id;

    if (!isClient && !isFixer) {
      return NextResponse.json(
        { message: 'You can only review jobs you were involved in' },
        { status: 403 }
      );
    }

    // Verify review type matches user role
    if (isClient && reviewType !== 'client_to_fixer') {
      return NextResponse.json(
        { message: 'Invalid review type for your role' },
        { status: 400 }
      );
    }

    if (isFixer && reviewType !== 'fixer_to_client') {
      return NextResponse.json(
        { message: 'Invalid review type for your role' },
        { status: 400 }
      );
    }

    // Verify reviewee
    if ((reviewType === 'client_to_fixer' && revieweeId !== job.fixer._id.toString()) ||
        (reviewType === 'fixer_to_client' && revieweeId !== job.client._id.toString())) {
      return NextResponse.json(
        { message: 'Invalid reviewee for this job' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      job: jobId,
      reviewer: session.user.id
    });

    if (existingReview) {
      return NextResponse.json(
        { message: 'You have already reviewed this job' },
        { status: 400 }
      );
    }

    // Validate detailed ratings based on review type
    if (reviewType === 'client_to_fixer') {
      const requiredRatings = ['workQuality', 'communication', 'punctuality', 'professionalism'];
      for (const ratingType of requiredRatings) {
        if (!rating[ratingType] || rating[ratingType] < 1 || rating[ratingType] > 5) {
          return NextResponse.json(
            { message: `${ratingType} rating is required and must be between 1 and 5` },
            { status: 400 }
          );
        }
      }
    } else {
      const requiredRatings = ['clarity', 'responsiveness', 'paymentTimeliness'];
      for (const ratingType of requiredRatings) {
        if (!rating[ratingType] || rating[ratingType] < 1 || rating[ratingType] > 5) {
          return NextResponse.json(
            { message: `${ratingType} rating is required and must be between 1 and 5` },
            { status: 400 }
          );
        }
      }
    }

    // Create review
    const review = new Review({
      job: jobId,
      reviewer: session.user.id,
      reviewee: revieweeId,
      reviewType,
      rating,
      title: title.trim(),
      comment: comment.trim(),
      pros: pros.filter(p => p.trim()).map(p => p.trim()),
      cons: cons.filter(c => c.trim()).map(c => c.trim()),
      tags,
      wouldRecommend,
      wouldHireAgain: reviewType === 'client_to_fixer' ? wouldHireAgain : undefined,
      attachments,
      status: 'published', // Auto-publish for now, can add moderation later
      publishedAt: new Date()
    });

    await review.save();

    // Populate the saved review
    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name username photoURL role')
      .populate('reviewee', 'name username photoURL role')
      .populate('job', 'title category budget')
      .lean();

    // Create notification for reviewee
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: revieweeId,
          type: 'review',
          title: 'New Review Received',
          message: `${session.user.name} left you a ${rating.overall}-star review`,
          actionUrl: `/profile/${session.user.username}`,
          data: {
            reviewId: review._id,
            jobId,
            rating: rating.overall
          }
        }),
      });
    } catch (error) {
      console.error('Failed to create review notification:', error);
    }

    return NextResponse.json({
      success: true,
      review: populatedReview,
      message: 'Review submitted successfully'
    });

  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { message: 'Failed to create review' },
      { status: 500 }
    );
  }
}

// Update review (response from reviewee)
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { reviewId, responseComment } = await request.json();

    if (!reviewId || !responseComment || responseComment.trim().length === 0) {
      return NextResponse.json(
        { message: 'Review ID and response comment are required' },
        { status: 400 }
      );
    }

    if (responseComment.length > 500) {
      return NextResponse.json(
        { message: 'Response comment too long (max 500 characters)' },
        { status: 400 }
      );
    }

    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { message: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user is the reviewee
    if (review.reviewee.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'You can only respond to reviews about you' },
        { status: 403 }
      );
    }

    // Update review with response
    review.response = {
      comment: responseComment.trim(),
      respondedAt: new Date()
    };

    await review.save();

    return NextResponse.json({
      success: true,
      message: 'Response added successfully'
    });

  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json(
      { message: 'Failed to update review' },
      { status: 500 }
    );
  }
}