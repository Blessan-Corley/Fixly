// app/api/disputes/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../lib/db';
import Dispute from '../../../models/Dispute';
import Job from '../../../models/Job';
import User from '../../../models/User';
import { rateLimit } from '../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

// Get disputes
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'disputes', 100, 60 * 1000);
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query based on user role
    let query = {};
    
    if (session.user.role === 'admin' || session.user.role === 'moderator') {
      // Admin/moderator can see all disputes
      if (status) query.status = status;
      if (category) query.category = category;
    } else {
      // Regular users can only see disputes they're involved in
      query.$or = [
        { initiatedBy: session.user.id },
        { againstUser: session.user.id }
      ];
      if (status) query.status = status;
      if (category) query.category = category;
    }

    const skip = (page - 1) * limit;

    // Get disputes with populated data
    const disputes = await Dispute.find(query)
      .populate('job', 'title category budget status')
      .populate('initiatedBy', 'name username email photoURL role')
      .populate('againstUser', 'name username email photoURL role')
      .populate('assignedModerator', 'name username email role')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalDisputes = await Dispute.countDocuments(query);

    // Get statistics if admin
    let statistics = null;
    if (session.user.role === 'admin' || session.user.role === 'moderator') {
      statistics = await Dispute.getStatistics();
    }

    return NextResponse.json({
      success: true,
      disputes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalDisputes / limit),
        totalDisputes,
        hasMore: skip + disputes.length < totalDisputes
      },
      statistics
    });

  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}

// Create a new dispute
export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'create_dispute', 3, 60 * 60 * 1000); // 3 per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many dispute submissions. Please try again later.' },
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
      againstUserId,
      category,
      subcategory,
      title,
      description,
      desiredOutcome,
      desiredOutcomeDetails,
      disputedAmount,
      refundRequested,
      additionalPaymentRequested,
      evidence = []
    } = await request.json();

    // Validation
    if (!jobId || !againstUserId || !category || !title || !description || !desiredOutcome) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (title.length > 150 || description.length > 2000) {
      return NextResponse.json(
        { message: 'Title or description too long' },
        { status: 400 }
      );
    }

    if (againstUserId === session.user.id) {
      return NextResponse.json(
        { message: 'You cannot create a dispute against yourself' },
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

    // Check if user is involved in the job
    const isClient = job.client._id.toString() === session.user.id;
    const isFixer = job.fixer && job.fixer._id.toString() === session.user.id;

    if (!isClient && !isFixer) {
      return NextResponse.json(
        { message: 'You can only create disputes for jobs you are involved in' },
        { status: 403 }
      );
    }

    // Verify against user is the other party in the job
    const validAgainstUser = (isClient && job.fixer && job.fixer._id.toString() === againstUserId) ||
                            (isFixer && job.client._id.toString() === againstUserId);

    if (!validAgainstUser) {
      return NextResponse.json(
        { message: 'You can only create disputes against the other party in this job' },
        { status: 400 }
      );
    }

    // Check if there's already an active dispute for this job
    const existingDispute = await Dispute.findOne({
      job: jobId,
      isActive: true,
      status: { $nin: ['resolved', 'closed', 'cancelled'] }
    });

    if (existingDispute) {
      return NextResponse.json(
        { message: 'There is already an active dispute for this job' },
        { status: 400 }
      );
    }

    // Determine priority based on amount and category
    let priority = 'medium';
    const amount = disputedAmount || refundRequested || additionalPaymentRequested || 0;
    
    if (amount > 50000 || category === 'safety_concern') priority = 'high';
    else if (amount > 100000) priority = 'urgent';
    else if (amount < 5000) priority = 'low';

    // Create dispute
    const dispute = new Dispute({
      job: jobId,
      initiatedBy: session.user.id,
      againstUser: againstUserId,
      category,
      subcategory,
      title: title.trim(),
      description: description.trim(),
      desiredOutcome,
      desiredOutcomeDetails: desiredOutcomeDetails?.trim(),
      amount: {
        disputedAmount,
        refundRequested,
        additionalPaymentRequested
      },
      priority,
      evidence: evidence.map(e => ({
        ...e,
        uploadedAt: new Date()
      })),
      status: 'pending'
    });

    // Add initial timeline entry
    dispute.timeline.push({
      action: 'dispute_created',
      performedBy: session.user.id,
      description: 'Dispute created and submitted for review',
      timestamp: new Date()
    });

    await dispute.save();

    // Populate the saved dispute
    const populatedDispute = await Dispute.findById(dispute._id)
      .populate('job', 'title category budget')
      .populate('initiatedBy', 'name username email photoURL')
      .populate('againstUser', 'name username email photoURL')
      .lean();

    // Create notifications
    try {
      // Notify the other party
      await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: againstUserId,
          type: 'dispute',
          title: 'New Dispute Filed',
          message: `${session.user.name} has filed a dispute regarding "${job.title}"`,
          actionUrl: `/dashboard/disputes/${dispute.disputeId}`,
          priority: 'high',
          data: {
            disputeId: dispute.disputeId,
            jobId,
            category
          }
        }),
      });

      // Notify admins/moderators
      const moderators = await User.find({ role: { $in: ['admin', 'moderator'] } }).select('_id');
      for (const moderator of moderators) {
        await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: moderator._id,
            type: 'dispute',
            title: 'New Dispute Requires Review',
            message: `New ${category} dispute: ${title}`,
            actionUrl: `/admin/disputes/${dispute.disputeId}`,
            priority: priority === 'urgent' ? 'high' : 'medium',
            data: {
              disputeId: dispute.disputeId,
              category,
              priority
            }
          }),
        });
      }
    } catch (error) {
      console.error('Failed to create dispute notifications:', error);
    }

    return NextResponse.json({
      success: true,
      dispute: populatedDispute,
      message: 'Dispute submitted successfully'
    });

  } catch (error) {
    console.error('Create dispute error:', error);
    return NextResponse.json(
      { message: 'Failed to create dispute' },
      { status: 500 }
    );
  }
}

// Update dispute status (admin/moderator only)
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin' && session.user.role !== 'moderator') {
      return NextResponse.json(
        { message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { disputeId, status, moderatorNotes, assignedModerator } = await request.json();

    if (!disputeId || !status) {
      return NextResponse.json(
        { message: 'Dispute ID and status are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const dispute = await Dispute.findOne({ disputeId });
    if (!dispute) {
      return NextResponse.json(
        { message: 'Dispute not found' },
        { status: 404 }
      );
    }

    const oldStatus = dispute.status;
    dispute.status = status;
    
    if (moderatorNotes) {
      dispute.moderatorNotes = moderatorNotes;
    }
    
    if (assignedModerator) {
      dispute.assignedModerator = assignedModerator;
    }

    // Add timeline entry
    dispute.timeline.push({
      action: `status_changed_to_${status}`,
      performedBy: session.user.id,
      description: `Status changed from ${oldStatus} to ${status}`,
      timestamp: new Date()
    });

    await dispute.save();

    // Create notifications based on status change
    try {
      const notificationData = {
        type: 'dispute',
        actionUrl: `/dashboard/disputes/${disputeId}`,
        data: { disputeId, status }
      };

      if (status === 'under_review') {
        notificationData.title = 'Dispute Under Review';
        notificationData.message = 'Your dispute is now being reviewed by our team';
      } else if (status === 'awaiting_response') {
        notificationData.title = 'Response Required';
        notificationData.message = 'Please respond to the dispute within 7 days';
      } else if (status === 'in_mediation') {
        notificationData.title = 'Dispute in Mediation';
        notificationData.message = 'Your dispute has entered mediation process';
      } else if (status === 'resolved') {
        notificationData.title = 'Dispute Resolved';
        notificationData.message = 'Your dispute has been resolved';
      }

      // Notify both parties
      await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: dispute.initiatedBy,
          ...notificationData
        }),
      });

      await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: dispute.againstUser,
          ...notificationData
        }),
      });
    } catch (error) {
      console.error('Failed to create status change notifications:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Dispute status updated successfully'
    });

  } catch (error) {
    console.error('Update dispute error:', error);
    return NextResponse.json(
      { message: 'Failed to update dispute' },
      { status: 500 }
    );
  }
}