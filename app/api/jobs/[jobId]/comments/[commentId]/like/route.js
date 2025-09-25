// app/api/jobs/[jobId]/comments/[commentId]/like/route.js
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
    // Apply rate limiting - increased limits for better UX
    const rateLimitResult = await rateLimit(request, 'comment_likes', 500, 60 * 60 * 1000); // 500 likes per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many like actions. Please try again later.' },
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

    const { jobId, commentId } = params;
    if (!jobId || !commentId) {
      return NextResponse.json(
        { message: 'Job ID and comment ID are required' },
        { status: 400 }
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch (parseError) {
      // Empty body is fine for likes
    }
    
    const { replyId } = body; // Optional - if liking a reply

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
    let notificationTarget;
    let notificationMessage;

    try {
      if (replyId) {
        // Like/unlike reply
        result = job.toggleReplyLike(commentId, replyId, user._id);
        if (!result) {
          return NextResponse.json(
            { message: 'Reply not found' },
            { status: 404 }
          );
        }

        // Get the reply author for notification
        const comment = job.comments.id(commentId);
        const reply = comment.replies.id(replyId);
        notificationTarget = reply.author;
        notificationMessage = `${user.name} ${result.liked ? 'liked' : 'unliked'} your reply.`;
      } else {
        // Like/unlike comment
        result = job.toggleCommentLike(commentId, user._id);
        if (!result) {
          return NextResponse.json(
            { message: 'Comment not found' },
            { status: 404 }
          );
        }

        // Get the comment author for notification
        const comment = job.comments.id(commentId);
        notificationTarget = comment.author;
        notificationMessage = `${user.name} ${result.liked ? 'liked' : 'unliked'} your comment on "${job.title}".`;
      }

      await job.save();
    } catch (likeError) {
      return NextResponse.json(
        { 
          message: 'Failed to process like action',
          error: process.env.NODE_ENV === 'development' ? likeError.message : undefined
        },
        { status: 500 }
      );
    }

    // Send notification only for likes (not unlikes) and not to self
    if (result.liked && notificationTarget.toString() !== user._id.toString()) {
      await sendTemplatedNotification(
        'COMMENT_LIKE',
        notificationTarget.toString(),
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

    // Emit real-time event for like/unlike via Ably
    try {
      const ably = getServerAbly();
      const channel = ably.channels.get(CHANNELS.jobComments(jobId));

      await channel.publish(EVENTS.COMMENT_LIKED, {
        commentId,
        replyId,
        jobId,
        userId: user._id,
        userName: user.name,
        liked: result.liked,
        likeCount: result.likeCount,
        type: replyId ? 'reply' : 'comment',
        timestamp: new Date().toISOString()
      });
    } catch (ablyError) {
      console.error('Failed to publish like event:', ablyError);
    }

    return NextResponse.json({
      success: true,
      message: result.liked ? 
        (replyId ? 'Reply liked successfully' : 'Comment liked successfully') :
        (replyId ? 'Reply unliked successfully' : 'Comment unliked successfully'),
      liked: result.liked,
      likeCount: result.likeCount
    });

  } catch (error) {
    return NextResponse.json(
      { 
        message: 'Failed to process like action',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
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
        path: 'comments.likes.user',
        select: 'name username photoURL',
        options: { lean: true }
      })
      .populate({
        path: 'comments.replies.likes.user',
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

    let likes, likeCount, liked;

    if (replyId) {
      // Get reply likes
      const reply = comment.replies.find(r => r._id.toString() === replyId);
      if (!reply) {
        return NextResponse.json(
          { message: 'Reply not found' },
          { status: 404 }
        );
      }

      likes = reply.likes || [];
      likeCount = likes.length;
      liked = session ? likes.some(like => like.user?._id?.toString() === session.user.id) : false;
    } else {
      // Get comment likes
      likes = comment.likes || [];
      likeCount = likes.length;
      liked = session ? likes.some(like => like.user?._id?.toString() === session.user.id) : false;
    }

    return NextResponse.json({
      likeCount,
      liked,
      likes
    });

  } catch (error) {
    return NextResponse.json(
      { 
        message: 'Failed to fetch comment likes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}