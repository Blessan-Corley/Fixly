// app/api/jobs/[jobId]/comments/[commentId]/react/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { getServerAbly, CHANNELS, EVENTS } from '@/lib/ably';
import { sendTemplatedNotification, NOTIFICATION_TEMPLATES } from '@/lib/services/notificationService';

export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'comment_reactions', 300, 60 * 60 * 1000); // 300 reactions per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many reaction actions. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId, commentId } = params;
    if (!jobId || !commentId) {
      return NextResponse.json(
        { message: 'Job ID and comment ID are required' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { reactionType, replyId } = body;

    if (!reactionType || !['thumbs_up', 'thumbs_down', 'heart', 'laugh', 'wow', 'angry'].includes(reactionType)) {
      return NextResponse.json(
        { message: 'Valid reaction type is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { message: 'Account suspended' },
        { status: 403 }
      );
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    let result;
    let targetAuthor;
    let notificationMessage;

    try {
      if (replyId) {
        // React to reply
        result = job.toggleReplyReaction(commentId, replyId, user._id, reactionType);
        if (!result) {
          return NextResponse.json(
            { message: 'Reply not found' },
            { status: 404 }
          );
        }

        // Get the reply author for notification
        const comment = job.comments.id(commentId);
        const reply = comment.replies.id(replyId);
        targetAuthor = reply.author;
        notificationMessage = `${user.name} reacted ${reactionType} to your reply`;
      } else {
        // React to comment
        result = job.toggleCommentReaction(commentId, user._id, reactionType);
        if (!result) {
          return NextResponse.json(
            { message: 'Comment not found' },
            { status: 404 }
          );
        }

        // Get the comment author for notification
        const comment = job.comments.id(commentId);
        targetAuthor = comment.author;
        notificationMessage = `${user.name} reacted ${reactionType} to your comment on "${job.title}"`;
      }

      await job.save();
    } catch (reactionError) {
      return NextResponse.json(
        { 
          message: 'Failed to process reaction',
          error: process.env.NODE_ENV === 'development' ? reactionError.message : undefined
        },
        { status: 500 }
      );
    }

    // Send notification only for new reactions (not removals) and not to self
    if (result.reacted && targetAuthor.toString() !== user._id.toString()) {
      await sendTemplatedNotification(
        'COMMENT_LIKE',
        targetAuthor.toString(),
        {
          likerName: user.name,
          jobId: job._id.toString(),
          commentId: commentId
        },
        {
          senderId: user._id.toString(),
          priority: 'low'
        }
      );
    }

    // Emit real-time event for reaction via Ably
    try {
      const ably = getServerAbly();
      const channel = ably.channels.get(CHANNELS.jobComments(jobId));

      await channel.publish(EVENTS.COMMENT_REACTED, {
        commentId,
        replyId,
        jobId,
        userId: user._id,
        userName: user.name,
        reacted: result.reacted,
        reactionType: result.reactionType,
        reactionCount: result.count,
        type: replyId ? 'reply' : 'comment',
        timestamp: new Date().toISOString()
      });
    } catch (ablyError) {
      console.error('Failed to publish reaction event:', ablyError);
    }

    return NextResponse.json({
      success: true,
      message: result.reacted ? 
        `Reacted with ${result.reactionType}` : 
        'Reaction removed',
      reacted: result.reacted,
      reactionType: result.reactionType,
      reactionCount: result.count
    });

  } catch (error) {
    console.error('Comment reaction error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to process reaction',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { jobId, commentId } = params;
    const { searchParams } = new URL(request.url);
    const replyId = searchParams.get('replyId');

    if (!jobId || !commentId) {
      return NextResponse.json(
        { message: 'Job ID and comment ID are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(jobId)
      .select('comments')
      .populate({
        path: 'comments.reactions.user',
        select: 'name username photoURL',
        options: { lean: true }
      })
      .populate({
        path: 'comments.replies.reactions.user',
        select: 'name username photoURL',
        options: { lean: true }
      })
      .lean();

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    const comment = job.comments.find(c => c._id.toString() === commentId);
    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }

    let reactions, reactionCounts;

    if (replyId) {
      // Get reply reactions
      const reply = comment.replies.find(r => r._id.toString() === replyId);
      if (!reply) {
        return NextResponse.json(
          { message: 'Reply not found' },
          { status: 404 }
        );
      }
      reactions = reply.reactions || [];
    } else {
      // Get comment reactions
      reactions = comment.reactions || [];
    }

    // Calculate reaction counts by type
    reactionCounts = reactions.reduce((counts, reaction) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {});

    return NextResponse.json({
      reactions,
      reactionCounts,
      totalReactions: reactions.length
    });

  } catch (error) {
    console.error('Get comment reactions error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to fetch reactions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}