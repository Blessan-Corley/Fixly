// app/api/jobs/[jobId]/messages/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'send_message', 30, 60 * 1000); // 30 messages per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many messages. Please slow down.' },
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
    const { message, attachments } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { message: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { message: 'Message cannot exceed 1000 characters' },
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

    // Check if user is involved in this job
    const isHirer = job.createdBy.toString() === user._id.toString();
    const isFixer = job.assignedTo && job.assignedTo.toString() === user._id.toString();
    
    // Messages are only allowed when job is accepted (has assignedTo)
    if (!job.assignedTo) {
      return NextResponse.json(
        { message: 'Messages are only available after the job has been accepted' },
        { status: 403 }
      );
    }

    if (!isHirer && !isFixer) {
      return NextResponse.json(
        { message: 'You can only message jobs you are involved in' },
        { status: 403 }
      );
    }

    // For fixers, check if they have credits or subscription
    if (user.role === 'fixer' && !isHirer && !isFixer) {
      if (!user.canApplyToJob()) {
        return NextResponse.json(
          { message: 'You need to upgrade to Pro or have free credits to message hirers' },
          { status: 403 }
        );
      }
    }

    // Initialize messages array if it doesn't exist
    if (!job.messages) {
      job.messages = [];
    }

    // Create message object
    const newMessage = {
      sender: user._id,
      message: message.trim(),
      attachments: attachments || [],
      sentAt: new Date(),
      read: false
    };

    job.messages.push(newMessage);
    await job.save();

    // Populate the message with sender info
    await job.populate('messages.sender', 'name username photoURL');
    const populatedMessage = job.messages[job.messages.length - 1];

    // Send notification to the other party
    let recipientId;
    if (isHirer) {
      recipientId = job.assignedTo || job.applications.find(app => 
        app.status === 'pending'
      )?.fixer;
    } else {
      recipientId = job.createdBy;
    }

    if (recipientId) {
      const recipient = await User.findById(recipientId);
      if (recipient) {
        await recipient.addNotification(
          'new_message',
          'New Message',
          `${user.name} sent you a message about "${job.title}"`,
          {
            jobId: job._id,
            senderId: user._id,
            senderName: user.name
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: populatedMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { message: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;

    await connectDB();

    const user = await User.findById(session.user.id);
    const job = await Job.findById(jobId)
      .populate('messages.sender', 'name username photoURL')
      .select('messages createdBy assignedTo applications');

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if user can view messages
    const isHirer = job.createdBy.toString() === user._id.toString();
    const isFixer = job.assignedTo && job.assignedTo.toString() === user._id.toString();
    
    // Messages are only available when job is accepted (has assignedTo)
    if (!job.assignedTo) {
      return NextResponse.json(
        { message: 'Messages are only available after the job has been accepted' },
        { status: 403 }
      );
    }

    if (!isHirer && !isFixer) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      );
    }

    // Mark messages as read for this user
    if (job.messages) {
      job.messages.forEach(msg => {
        if (msg.sender.toString() !== user._id.toString()) {
          msg.read = true;
        }
      });
      await job.save();
    }

    return NextResponse.json({
      messages: job.messages || []
    });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}