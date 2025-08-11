// app/api/jobs/[jobId]/comments/[commentId]/like/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../../../lib/db';
import Job from '../../../../../../../models/Job';
import User from '../../../../../../../models/User';
import { rateLimit } from '../../../../../../../utils/rateLimiting';

export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'comment_likes', 200, 60 * 60 * 1000); // 200 likes per hour
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

    const body = await request.json();
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

    // Send notification only for likes (not unlikes) and not to self
    if (result.liked && notificationTarget.toString() !== user._id.toString()) {
      const targetUser = await User.findById(notificationTarget);
      if (targetUser) {
        await targetUser.addNotification(
          replyId ? 'reply_liked' : 'comment_liked',
          replyId ? 'Reply Liked' : 'Comment Liked',
          notificationMessage,
          {
            jobId: job._id,
            commentId,
            replyId,
            fromUser: user._id
          }
        );
      }
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
    console.error('Like comment error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
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
      .populate('comments.likes.user', 'name username photoURL')
      .populate('comments.replies.likes.user', 'name username photoURL')
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
    console.error('Get comment likes error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch comment likes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}