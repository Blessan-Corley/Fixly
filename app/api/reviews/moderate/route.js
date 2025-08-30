// app/api/reviews/moderate/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';
import { validateAndSanitize, addSecurityHeaders } from '@/utils/validation';
import { emitToUser } from '@/lib/socket';

export const dynamic = 'force-dynamic';

// POST /api/reviews/moderate - Moderate a review (admin only)
export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'admin_actions', 50, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get admin user
    const admin = await User.findById(session.user.id);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { 
          message: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      jobId,
      reviewType, // 'fixer' or 'hirer'
      action, // 'approve', 'reject', 'hide', 'flag', 'delete'
      reason,
      adminNotes,
      notifyUser = true
    } = body;

    // Validate required fields
    if (!jobId || !reviewType || !action) {
      return NextResponse.json(
        { 
          message: 'Job ID, review type, and action are required',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['approve', 'reject', 'hide', 'flag', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { 
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
          code: 'INVALID_ACTION'
        },
        { status: 400 }
      );
    }

    // Get job with populated data
    const job = await Job.findById(jobId)
      .populate('createdBy', 'name email username')
      .populate('assignedTo', 'name email username');

    if (!job) {
      return NextResponse.json(
        { 
          message: 'Job not found',
          code: 'JOB_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Get the specific review
    const review = reviewType === 'fixer' 
      ? job.completion.fixerRating 
      : job.completion.hirerRating;

    if (!review || !review.rating) {
      return NextResponse.json(
        { 
          message: `No ${reviewType} review found for this job`,
          code: 'REVIEW_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Apply moderation action
    const moderationResult = await applyModerationAction(
      job, 
      reviewType, 
      action, 
      admin._id, 
      reason, 
      adminNotes
    );

    if (!moderationResult.success) {
      return NextResponse.json(
        { 
          message: moderationResult.error || 'Moderation action failed',
          code: 'MODERATION_FAILED'
        },
        { status: 400 }
      );
    }

    // Save the job
    await job.save();

    // Send notification to review author if requested
    if (notifyUser && review.ratedBy) {
      const reviewAuthor = await User.findById(review.ratedBy);
      if (reviewAuthor) {
        const notificationMessage = generateModerationNotification(action, reason);
        
        reviewAuthor.addNotification(
          'review_moderated',
          'Review Moderated',
          notificationMessage,
          {
            jobId: jobId,
            reviewType,
            action,
            reason
          }
        );
        
        await reviewAuthor.save();

        // Send real-time notification
        try {
          emitToUser(reviewAuthor._id.toString(), 'notification', {
            type: 'review_moderated',
            title: 'Review Moderated',
            message: notificationMessage,
            jobId: jobId,
            action
          });
        } catch (socketError) {
          console.warn('Socket notification failed:', socketError);
        }
      }
    }

    // Log admin action
    console.log(`🛡️ Admin ${admin.username} ${action}ed ${reviewType} review for job ${jobId}: ${reason || 'No reason'}`);

    const response = NextResponse.json({
      success: true,
      message: `Review ${action}ed successfully`,
      moderation: {
        action,
        moderatedBy: admin.username,
        moderatedAt: new Date(),
        reason: reason || null,
        adminNotes: adminNotes || null
      },
      review: {
        jobId,
        reviewType,
        status: moderationResult.newStatus,
        visible: moderationResult.visible
      }
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Review moderation error:', error);
    const response = NextResponse.json(
      { 
        message: 'Failed to moderate review',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// GET /api/reviews/moderate - Get reviews that need moderation
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'admin_requests', 100, 15 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get admin user
    const admin = await User.findById(session.user.id);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit')) || 20), 100);
    const status = searchParams.get('status') || 'all'; // 'flagged', 'pending', 'all'
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build query for jobs with reviews
    const query = {
      $or: [
        { 'completion.fixerRating.rating': { $exists: true } },
        { 'completion.hirerRating.rating': { $exists: true } }
      ]
    };

    // Filter by status if specified
    if (status === 'flagged') {
      query.$or = [
        { 'completion.fixerRating.moderation.status': 'flagged' },
        { 'completion.hirerRating.moderation.status': 'flagged' }
      ];
    } else if (status === 'pending') {
      query.$or = [
        { 
          'completion.fixerRating.rating': { $exists: true },
          'completion.fixerRating.moderation.status': { $exists: false }
        },
        { 
          'completion.hirerRating.rating': { $exists: true },
          'completion.hirerRating.moderation.status': { $exists: false }
        }
      ];
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'oldest':
        sort.createdAt = 1;
        break;
      case 'rating_low':
        sort['completion.fixerRating.rating'] = 1;
        break;
      case 'rating_high':
        sort['completion.fixerRating.rating'] = -1;
        break;
      default:
        sort.createdAt = -1;
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('createdBy', 'name username email profilePhoto')
        .populate('assignedTo', 'name username email profilePhoto')
        .populate('completion.fixerRating.ratedBy', 'name username email')
        .populate('completion.hirerRating.ratedBy', 'name username email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(query)
    ]);

    // Process and format reviews
    const reviewsForModeration = [];
    
    jobs.forEach(job => {
      // Add fixer review if exists
      if (job.completion.fixerRating?.rating) {
        reviewsForModeration.push({
          id: `${job._id}_fixer`,
          jobId: job._id,
          jobTitle: job.title,
          reviewType: 'fixer',
          rating: job.completion.fixerRating.rating,
          review: job.completion.fixerRating.review,
          categories: job.completion.fixerRating.categories,
          ratedBy: job.completion.fixerRating.ratedBy,
          ratedAt: job.completion.fixerRating.ratedAt,
          aboutUser: job.assignedTo,
          moderation: job.completion.fixerRating.moderation || {
            status: 'pending',
            moderatedAt: null,
            moderatedBy: null
          },
          createdAt: job.createdAt,
          jobCreator: job.createdBy
        });
      }

      // Add hirer review if exists
      if (job.completion.hirerRating?.rating) {
        reviewsForModeration.push({
          id: `${job._id}_hirer`,
          jobId: job._id,
          jobTitle: job.title,
          reviewType: 'hirer',
          rating: job.completion.hirerRating.rating,
          review: job.completion.hirerRating.review,
          categories: job.completion.hirerRating.categories,
          ratedBy: job.completion.hirerRating.ratedBy,
          ratedAt: job.completion.hirerRating.ratedAt,
          aboutUser: job.createdBy,
          moderation: job.completion.hirerRating.moderation || {
            status: 'pending',
            moderatedAt: null,
            moderatedBy: null
          },
          createdAt: job.createdAt,
          jobCreator: job.createdBy
        });
      }
    });

    // Get moderation statistics
    const stats = await getReviewModerationStats();

    const response = NextResponse.json({
      success: true,
      reviews: reviewsForModeration,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + reviewsForModeration.length < total
      },
      filters: {
        status,
        sortBy
      },
      stats
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Get reviews for moderation error:', error);
    const response = NextResponse.json(
      { message: 'Failed to get reviews for moderation' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Apply moderation action to a review
async function applyModerationAction(job, reviewType, action, adminId, reason, adminNotes) {
  try {
    const reviewPath = reviewType === 'fixer' ? 'completion.fixerRating' : 'completion.hirerRating';
    const review = reviewType === 'fixer' ? job.completion.fixerRating : job.completion.hirerRating;

    if (!review) {
      return { success: false, error: 'Review not found' };
    }

    // Initialize moderation object if not exists
    if (!review.moderation) {
      review.moderation = {};
    }

    let newStatus = 'pending';
    let visible = true;

    switch (action) {
      case 'approve':
        newStatus = 'approved';
        visible = true;
        break;
      case 'reject':
        newStatus = 'rejected';
        visible = false;
        break;
      case 'hide':
        newStatus = 'hidden';
        visible = false;
        break;
      case 'flag':
        newStatus = 'flagged';
        visible = false;
        break;
      case 'delete':
        // For deletion, we might want to keep the record but mark it as deleted
        newStatus = 'deleted';
        visible = false;
        break;
      default:
        return { success: false, error: 'Invalid action' };
    }

    // Update moderation info
    review.moderation = {
      ...review.moderation,
      status: newStatus,
      moderatedBy: adminId,
      moderatedAt: new Date(),
      reason: reason || review.moderation.reason,
      adminNotes: adminNotes || review.moderation.adminNotes,
      visible
    };

    return { 
      success: true, 
      newStatus, 
      visible 
    };

  } catch (error) {
    console.error('Apply moderation action error:', error);
    return { success: false, error: error.message };
  }
}

// Generate notification message based on moderation action
function generateModerationNotification(action, reason) {
  const messages = {
    approve: 'Your review has been approved and is now visible.',
    reject: `Your review has been rejected${reason ? `: ${reason}` : '.'}`,
    hide: `Your review has been hidden${reason ? `: ${reason}` : '.'}`,
    flag: `Your review has been flagged for review${reason ? `: ${reason}` : '.'}`,
    delete: `Your review has been removed${reason ? `: ${reason}` : '.'}`
  };

  return messages[action] || 'Your review has been moderated.';
}

// Get review moderation statistics
async function getReviewModerationStats() {
  try {
    const stats = await Job.aggregate([
      {
        $match: {
          $or: [
            { 'completion.fixerRating.rating': { $exists: true } },
            { 'completion.hirerRating.rating': { $exists: true } }
          ]
        }
      },
      {
        $project: {
          fixerReview: {
            $cond: [
              { $exists: ['$completion.fixerRating.rating', true] },
              {
                status: { 
                  $ifNull: ['$completion.fixerRating.moderation.status', 'pending'] 
                },
                rating: '$completion.fixerRating.rating'
              },
              null
            ]
          },
          hirerReview: {
            $cond: [
              { $exists: ['$completion.hirerRating.rating', true] },
              {
                status: { 
                  $ifNull: ['$completion.hirerRating.moderation.status', 'pending'] 
                },
                rating: '$completion.hirerRating.rating'
              },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { 
            $sum: {
              $add: [
                { $cond: [{ $ne: ['$fixerReview', null] }, 1, 0] },
                { $cond: [{ $ne: ['$hirerReview', null] }, 1, 0] }
              ]
            }
          },
          pending: {
            $sum: {
              $add: [
                { $cond: [{ $eq: ['$fixerReview.status', 'pending'] }, 1, 0] },
                { $cond: [{ $eq: ['$hirerReview.status', 'pending'] }, 1, 0] }
              ]
            }
          },
          approved: {
            $sum: {
              $add: [
                { $cond: [{ $eq: ['$fixerReview.status', 'approved'] }, 1, 0] },
                { $cond: [{ $eq: ['$hirerReview.status', 'approved'] }, 1, 0] }
              ]
            }
          },
          flagged: {
            $sum: {
              $add: [
                { $cond: [{ $eq: ['$fixerReview.status', 'flagged'] }, 1, 0] },
                { $cond: [{ $eq: ['$hirerReview.status', 'flagged'] }, 1, 0] }
              ]
            }
          },
          rejected: {
            $sum: {
              $add: [
                { $cond: [{ $eq: ['$fixerReview.status', 'rejected'] }, 1, 0] },
                { $cond: [{ $eq: ['$hirerReview.status', 'rejected'] }, 1, 0] }
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalReviews: 0,
      pending: 0,
      approved: 0,
      flagged: 0,
      rejected: 0
    };
  } catch (error) {
    console.error('Get moderation stats error:', error);
    return {
      totalReviews: 0,
      pending: 0,
      approved: 0,
      flagged: 0,
      rejected: 0
    };
  }
}