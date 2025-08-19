// app/api/jobs/[jobId]/comments/[commentId]/edit/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { moderateContent } from '@/utils/sensitiveContentFilter';
import { emitToJob } from '@/lib/socket';

export async function PUT(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'comment_edits', 50, 60 * 60 * 1000); // 50 edits per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many edit actions. Please try again later.' },
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

    const { message, replyId, mentions = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      );
    }

    if (message.trim().length > 500) {
      return NextResponse.json(
        { message: 'Message cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Check for sensitive content
    let moderationResult;
    try {
      moderationResult = moderateContent(message.trim(), {
        allowAutoClean: false,
        strictMode: true
      });
    } catch (error) {
      console.error('❌ Moderation error:', error);
      // If moderation fails, allow content but log the error
      moderationResult = { allowed: true, content: message.trim() };
    }

    if (!moderationResult.allowed) {
      return NextResponse.json(
        { 
          message: moderationResult.message,
          violations: moderationResult.violations,
          type: 'sensitive_content'
        },
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

    try {
      if (replyId) {
        // Edit reply
        result = job.editReply(commentId, replyId, user._id, moderationResult.content, mentions);
      } else {
        // Edit comment
        result = job.editComment(commentId, user._id, moderationResult.content, mentions);
      }

      if (!result.success) {
        return NextResponse.json(
          { message: result.message },
          { status: result.message.includes('not found') ? 404 : 403 }
        );
      }

      await job.save();
    } catch (editError) {
      console.error('❌ Failed to edit:', editError);
      return NextResponse.json(
        { message: 'Failed to edit content' },
        { status: 500 }
      );
    }

    // Populate the edited content for response
    try {
      await job.populate({
        path: 'comments.author',
        select: 'name username photoURL role',
        options: { lean: true }
      });
      
      if (replyId) {
        await job.populate({
          path: 'comments.replies.author',
          select: 'name username photoURL role',
          options: { lean: true }
        });
      }
    } catch (populateError) {
      console.error('❌ Failed to populate edited content:', populateError);
    }

    // Send notifications to mentioned users
    if (mentions && mentions.length > 0) {
      try {
        const mentionedUsers = await User.find({
          _id: { $in: mentions.map(m => m.user) }
        });

        for (const mentionedUser of mentionedUsers) {
          if (mentionedUser._id.toString() !== user._id.toString()) {
            await mentionedUser.addNotification(
              'mention',
              'You were mentioned',
              `${user.name} mentioned you in ${replyId ? 'a reply' : 'a comment'} on "${job.title}"`,
              {
                jobId: job._id,
                commentId: commentId,
                replyId: replyId,
                fromUser: user._id
              }
            );
          }
        }
      } catch (mentionError) {
        console.error('❌ Failed to send mention notifications:', mentionError);
        // Don't fail the edit if mention notifications fail
      }
    }

    // Emit real-time event for edit
    emitToJob(jobId, 'comment:edited', {
      commentId,
      replyId,
      jobId,
      userId: user._id,
      userName: user.name,
      editedContent: moderationResult.content,
      mentions: mentions,
      type: replyId ? 'reply' : 'comment',
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      [replyId ? 'reply' : 'comment']: result[replyId ? 'reply' : 'comment']
    });

  } catch (error) {
    console.error('Edit comment error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { 
        message: 'Failed to edit content',
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

    let editHistory;

    if (replyId) {
      // Get reply edit history
      const reply = comment.replies.find(r => r._id.toString() === replyId);
      if (!reply) {
        return NextResponse.json(
          { message: 'Reply not found' },
          { status: 404 }
        );
      }
      editHistory = reply.edited || { isEdited: false, editHistory: [] };
    } else {
      // Get comment edit history
      editHistory = comment.edited || { isEdited: false, editHistory: [] };
    }

    return NextResponse.json({
      isEdited: editHistory.isEdited,
      editedAt: editHistory.editedAt,
      editHistory: editHistory.editHistory || []
    });

  } catch (error) {
    console.error('Get edit history error:', error);
    return NextResponse.json(
      { 
        message: 'Failed to fetch edit history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}