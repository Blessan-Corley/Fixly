// app/api/disputes/[disputeId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import Dispute from '../../../../models/Dispute';

export const dynamic = 'force-dynamic';

// Get specific dispute
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { disputeId } = params;

    await connectDB();

    const dispute = await Dispute.findOne({ disputeId })
      .populate('job', 'title category budget status description location')
      .populate('initiatedBy', 'name username email photoURL role rating')
      .populate('againstUser', 'name username email photoURL role rating')
      .populate('assignedModerator', 'name username email role')
      .populate('messages.sender', 'name username photoURL role')
      .lean();

    if (!dispute) {
      return NextResponse.json(
        { message: 'Dispute not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this dispute
    const canView = 
      dispute.initiatedBy._id.toString() === session.user.id ||
      dispute.againstUser._id.toString() === session.user.id ||
      session.user.role === 'admin' ||
      session.user.role === 'moderator' ||
      (dispute.assignedModerator && dispute.assignedModerator._id.toString() === session.user.id);

    if (!canView) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    // Mark as viewed by current user
    if (!dispute.metadata.viewedBy.some(v => v.user.toString() === session.user.id)) {
      await Dispute.updateOne(
        { disputeId },
        {
          $push: {
            'metadata.viewedBy': {
              user: session.user.id,
              viewedAt: new Date()
            }
          }
        }
      );
    }

    // Filter messages based on user role and privacy
    if (session.user.role !== 'admin' && session.user.role !== 'moderator') {
      dispute.messages = dispute.messages.filter(msg => msg.isPublic);
    }

    return NextResponse.json({
      success: true,
      dispute
    });

  } catch (error) {
    console.error('Get dispute error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch dispute' },
      { status: 500 }
    );
  }
}

// Add message to dispute
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { disputeId } = params;
    const { content, isPublic = true } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { message: 'Message too long (max 2000 characters)' },
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

    // Check if user has permission to add messages
    const canMessage = 
      dispute.initiatedBy.toString() === session.user.id ||
      dispute.againstUser.toString() === session.user.id ||
      session.user.role === 'admin' ||
      session.user.role === 'moderator' ||
      (dispute.assignedModerator && dispute.assignedModerator.toString() === session.user.id);

    if (!canMessage) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    // Determine sender type
    let senderType = 'client';
    if (session.user.role === 'admin') senderType = 'admin';
    else if (session.user.role === 'moderator') senderType = 'moderator';
    else if (session.user.role === 'fixer') senderType = 'fixer';

    // Add message
    await dispute.addMessage(session.user.id, senderType, content.trim(), isPublic);

    // Add timeline entry
    dispute.timeline.push({
      action: 'message_added',
      performedBy: session.user.id,
      description: `${senderType} added a message`,
      timestamp: new Date()
    });

    await dispute.save();

    // Create notifications for other parties
    try {
      const otherPartyId = dispute.initiatedBy.toString() === session.user.id 
        ? dispute.againstUser.toString() 
        : dispute.initiatedBy.toString();

      await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: otherPartyId,
          type: 'dispute',
          title: 'New Dispute Message',
          message: `${session.user.name} added a message to the dispute`,
          actionUrl: `/dashboard/disputes/${disputeId}`,
          data: { disputeId }
        }),
      });
    } catch (error) {
      console.error('Failed to create message notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Message added successfully'
    });

  } catch (error) {
    console.error('Add dispute message error:', error);
    return NextResponse.json(
      { message: 'Failed to add message' },
      { status: 500 }
    );
  }
}

// Submit response to dispute
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { disputeId } = params;
    const { 
      content, 
      acknowledgement, 
      counterEvidence = [],
      counterClaim 
    } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { message: 'Response content is required' },
        { status: 400 }
      );
    }

    if (!acknowledgement || !['acknowledge', 'dispute', 'counter_claim'].includes(acknowledgement)) {
      return NextResponse.json(
        { message: 'Valid acknowledgement is required' },
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

    // Check if user is the respondent
    if (dispute.againstUser.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'Only the respondent can submit a response' },
        { status: 403 }
      );
    }

    // Check if response already exists
    if (dispute.response && dispute.response.respondedBy) {
      return NextResponse.json(
        { message: 'Response already submitted' },
        { status: 400 }
      );
    }

    // Update dispute with response
    dispute.response = {
      respondedBy: session.user.id,
      content: content.trim(),
      counterEvidence: counterEvidence.map(e => ({
        ...e,
        uploadedAt: new Date()
      })),
      respondedAt: new Date(),
      acknowledgement,
      counterClaim: acknowledgement === 'counter_claim' ? counterClaim : undefined
    };

    // Update status based on acknowledgement
    if (acknowledgement === 'acknowledge') {
      dispute.status = 'resolved';
      dispute.addTimelineEntry(
        'response_acknowledged',
        session.user.id,
        'Respondent acknowledged the dispute and agreed to resolution'
      );
    } else {
      dispute.status = 'in_mediation';
      dispute.addTimelineEntry(
        'response_disputed',
        session.user.id,
        'Respondent disputed the claims and requested mediation'
      );
    }

    await dispute.save();

    // Create notifications
    try {
      const notificationData = {
        userId: dispute.initiatedBy.toString(),
        type: 'dispute',
        actionUrl: `/dashboard/disputes/${disputeId}`,
        data: { disputeId, acknowledgement }
      };

      if (acknowledgement === 'acknowledge') {
        notificationData.title = 'Dispute Acknowledged';
        notificationData.message = 'The other party acknowledged your dispute';
      } else {
        notificationData.title = 'Dispute Response Received';
        notificationData.message = 'The other party has responded to your dispute';
      }

      await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
    } catch (error) {
      console.error('Failed to create response notification:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Response submitted successfully'
    });

  } catch (error) {
    console.error('Submit dispute response error:', error);
    return NextResponse.json(
      { message: 'Failed to submit response' },
      { status: 500 }
    );
  }
}