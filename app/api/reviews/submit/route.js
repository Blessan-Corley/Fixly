import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';
import { getServerAbly, CHANNELS, EVENTS } from '@/lib/ably';
import rateLimitMiddleware from '@/lib/rateLimit';
import cacheMiddleware from '@/lib/redisCache';
import { contentValidationMiddleware, FieldValidators } from '@/lib/contentValidation';
import inputSanitizationMiddleware, { CustomSanitizers, schemaSanitize } from '@/lib/inputSanitization';
import { sendReviewCompletionMessage } from '@/lib/services/automatedMessaging';

// Review submission schema for validation
const reviewSchema = {
  jobId: {
    sanitizer: (id) => {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid job ID');
      }
      return id.trim();
    },
    required: true
  },
  rating: {
    sanitizer: CustomSanitizers.amount,
    required: true
  },
  comment: {
    sanitizer: FieldValidators.userComment,
    required: true
  },
  title: {
    sanitizer: (title) => {
      if (!title) return 'Job Review';
      return FieldValidators.jobTitle(title);
    },
    required: false
  },
  categories: {
    sanitizer: (categories) => {
      if (!categories || typeof categories !== 'object') {
        throw new Error('Categories must be an object');
      }
      const sanitized = {};
      Object.entries(categories).forEach(([key, value]) => {
        sanitized[key] = CustomSanitizers.amount(value);
      });
      return sanitized;
    },
    required: true
  },
  pros: {
    sanitizer: (pros) => {
      if (!Array.isArray(pros)) return [];
      return pros.slice(0, 5).map(pro =>
        typeof pro === 'string' ? pro.trim().substring(0, 200) : ''
      ).filter(Boolean);
    },
    required: false
  },
  cons: {
    sanitizer: (cons) => {
      if (!Array.isArray(cons)) return [];
      return cons.slice(0, 5).map(con =>
        typeof con === 'string' ? con.trim().substring(0, 200) : ''
      ).filter(Boolean);
    },
    required: false
  },
  wouldRecommend: {
    sanitizer: (value) => Boolean(value),
    required: false
  },
  wouldHireAgain: {
    sanitizer: (value) => value !== undefined ? Boolean(value) : undefined,
    required: false
  },
  tags: {
    sanitizer: (tags) => {
      if (!Array.isArray(tags)) return [];
      const allowedTags = [
        'excellent_work', 'on_time', 'great_communication', 'professional',
        'exceeded_expectations', 'fair_price', 'clean_work', 'polite',
        'experienced', 'reliable', 'creative', 'efficient',
        'poor_quality', 'late', 'unprofessional', 'overpriced',
        'miscommunication', 'incomplete', 'rude', 'inexperienced'
      ];
      return tags.slice(0, 10).filter(tag =>
        typeof tag === 'string' && allowedTags.includes(tag)
      );
    },
    required: false
  }
};

// Apply security middlewares
async function applyMiddlewares(request) {
  const req = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body: null,
    user: null
  };

  const res = {
    status: (code) => ({ json: (data) => ({ status: code, data }) }),
    json: (data) => ({ data }),
    setHeader: () => {}
  };

  // Get session for user context
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    req.user = { id: session.user.id };
  }

  // Parse body
  try {
    req.body = await request.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }

  // Apply rate limiting
  const rateLimitResult = await new Promise((resolve) => {
    rateLimitMiddleware({ requests: 5, window: 3600 })(req, res, () => resolve(null));
  });

  if (rateLimitResult) {
    throw new Error('Rate limit exceeded');
  }

  // Apply input sanitization
  const sanitizationResult = await new Promise((resolve) => {
    inputSanitizationMiddleware()(req, res, () => resolve(null));
  });

  if (sanitizationResult) {
    throw new Error('Input sanitization failed');
  }

  // Apply content validation
  const validationResult = await new Promise((resolve) => {
    contentValidationMiddleware()(req, res, () => resolve(null));
  });

  if (validationResult) {
    throw new Error('Content validation failed');
  }

  return req.body;
}

export async function POST(request) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Apply all security middlewares
    let sanitizedBody;
    try {
      sanitizedBody = await applyMiddlewares(request);
    } catch (error) {
      return NextResponse.json(
        { error: 'Security validation failed', message: error.message },
        { status: 400 }
      );
    }

    // Schema-based sanitization and validation
    let validatedData;
    try {
      validatedData = schemaSanitize(sanitizedBody, reviewSchema);
    } catch (error) {
      return NextResponse.json(
        { error: 'Data validation failed', message: error.message },
        { status: 400 }
      );
    }

    const {
      jobId,
      rating,
      comment,
      categories,
      title = 'Job Review',
      pros = [],
      cons = [],
      wouldRecommend = true,
      wouldHireAgain,
      tags = []
    } = validatedData;

    // Additional business logic validation
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate category ratings
    Object.values(categories).forEach(categoryRating => {
      if (categoryRating < 1 || categoryRating > 5) {
        throw new Error('Category ratings must be between 1 and 5');
      }
    });

    // Find the job
    const job = await Job.findById(jobId)
      .populate('createdBy', 'name username email')
      .populate('assignedTo', 'name username email');

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to review
    const isHirer = job.createdBy._id.toString() === userId;
    const isFixer = job.assignedTo && job.assignedTo._id.toString() === userId;

    if (!isHirer && !isFixer) {
      return NextResponse.json(
        { error: 'Only job participants can submit reviews' },
        { status: 403 }
      );
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job must be completed before reviews can be submitted' },
        { status: 400 }
      );
    }

    // Determine review type and participants
    const reviewType = isHirer ? 'client_to_fixer' : 'fixer_to_client';
    const revieweeId = isHirer ? job.assignedTo._id : job.createdBy._id;

    // Check if review already exists
    const existingReview = await Review.findOne({
      job: jobId,
      reviewer: userId,
      reviewType
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this job' },
        { status: 400 }
      );
    }

    // Create detailed rating object based on review type
    const detailedRating = { overall: rating };

    if (reviewType === 'client_to_fixer') {
      detailedRating.workQuality = categories.quality || rating;
      detailedRating.communication = categories.communication || rating;
      detailedRating.punctuality = categories.timeliness || rating;
      detailedRating.professionalism = categories.professionalism || rating;
    } else {
      detailedRating.clarity = categories.clarity || rating;
      detailedRating.responsiveness = categories.responsiveness || rating;
      detailedRating.paymentTimeliness = categories.paymentTimeliness || rating;
    }

    // Create review document
    const reviewData = {
      job: jobId,
      reviewer: userId,
      reviewee: revieweeId,
      reviewType,
      rating: detailedRating,
      title: title || 'Job Review',
      comment,
      pros,
      cons,
      wouldRecommend,
      tags,
      status: 'published',
      publishedAt: new Date(),
      isVerified: true
    };

    if (reviewType === 'client_to_fixer' && wouldHireAgain !== undefined) {
      reviewData.wouldHireAgain = wouldHireAgain;
    }

    const review = new Review(reviewData);
    await review.save();

    // Update job with review data
    await job.submitReview(userId, {
      overall: rating,
      comment,
      ...categories
    });

    // Update user's profile ratings
    const revieweeUser = await User.findById(revieweeId);
    if (revieweeUser) {
      const ratings = await Review.getAverageRating(revieweeId);
      revieweeUser.rating = {
        average: ratings.average,
        count: ratings.total,
        distribution: ratings.distribution
      };
      await revieweeUser.save();
    }

    // Get job review status for real-time updates
    const reviewStatus = job.getReviewStatusForUI(userId);

    // Real-time notifications
    const ably = getServerAbly();

    // Notify the reviewee about the new review
    const revieweeChannel = ably.channels.get(CHANNELS.userNotifications(revieweeId));
    await revieweeChannel.publish(EVENTS.NOTIFICATION_SENT, {
      type: 'review_received',
      jobId: job._id,
      jobTitle: job.title,
      reviewerName: session.user.name,
      rating: rating,
      message: `You received a ${rating}-star review for "${job.title}"`
    });

    // If both reviews are now complete, send completion messages
    if (reviewStatus.bothReviewsComplete && !job.completion.reviewMessagesSent) {
      await sendReviewCompletionMessages(job, ably);

      // Send automated review completion message
      setTimeout(() => {
        sendReviewCompletionMessage(jobId).catch(console.error);
      }, 2000);

      // Mark review messages as sent
      job.completion.reviewMessagesSent = true;
      await job.save();
    }

    // Populate the review for response
    await review.populate([
      { path: 'reviewer', select: 'name username photoURL' },
      { path: 'reviewee', select: 'name username photoURL' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      review: review.toObject(),
      reviewStatus,
      messagingClosed: job.completion.messagingClosed
    });

  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

// Helper function to send automated review messages
async function sendReviewCompletionMessages(job, ably) {
  try {
    const hirerReview = job.completion.fixerRating;
    const fixerReview = job.completion.hirerRating;

    if (!hirerReview || !fixerReview) return;

    // Generate channel name for private messages
    const channelName = `job:${job._id}:private:${[job.createdBy._id, job.assignedTo._id].sort().join(':')}`;
    const channel = ably.channels.get(channelName);

    // Send hirer's review to fixer
    const hirerMessage = {
      id: `review_msg_${Date.now()}_hirer`,
      jobId: job._id,
      senderId: 'system',
      receiverId: job.assignedTo._id,
      content: `🌟 Review from ${job.createdBy.name}:\n\n${hirerReview.review}\n\nRating: ${hirerReview.rating}/5 stars`,
      type: 'review',
      timestamp: new Date().toISOString(),
      isSystemMessage: true,
      reviewData: {
        rating: hirerReview.rating,
        categories: hirerReview.categories,
        reviewerName: job.createdBy.name
      }
    };

    await channel.publish(EVENTS.MESSAGE_SENT, hirerMessage);

    // Send fixer's review to hirer
    const fixerMessage = {
      id: `review_msg_${Date.now()}_fixer`,
      jobId: job._id,
      senderId: 'system',
      receiverId: job.createdBy._id,
      content: `🌟 Review from ${job.assignedTo.name}:\n\n${fixerReview.review}\n\nRating: ${fixerReview.rating}/5 stars`,
      type: 'review',
      timestamp: new Date().toISOString(),
      isSystemMessage: true,
      reviewData: {
        rating: fixerReview.rating,
        categories: fixerReview.categories,
        reviewerName: job.assignedTo.name
      }
    };

    await channel.publish(EVENTS.MESSAGE_SENT, fixerMessage);

    // Send final closure message
    const closureMessage = {
      id: `closure_msg_${Date.now()}`,
      jobId: job._id,
      senderId: 'system',
      content: '🔒 This conversation has been closed as both parties have completed their reviews. Thank you for using Fixly!',
      type: 'system',
      timestamp: new Date().toISOString(),
      isSystemMessage: true
    };

    await channel.publish(EVENTS.MESSAGE_SENT, closureMessage);

  } catch (error) {
    console.error('Error sending review completion messages:', error);
  }
}