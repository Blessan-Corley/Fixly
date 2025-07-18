// app/api/jobs/[jobId]/comments/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/db';
import Job from '../../../../../models/Job';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

export async function POST(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'job_comments', 30, 60 * 60 * 1000); // 30 comments per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many comments. Please try again later.' },
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
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
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

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { message: 'Comment message is required' },
        { status: 400 }
      );
    }

    if (message.trim().length > 500) {
      return NextResponse.json(
        { message: 'Comment cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Add comment to job
    const comment = {
      author: user._id,
      message: message.trim(),
      createdAt: new Date(),
      replies: []
    };

    job.comments.push(comment);
    await job.save();

    // Populate the comment with author info for response
    await job.populate('comments.author', 'name username photoURL');
    const newComment = job.comments[job.comments.length - 1];

    // Send notification to job creator (if not the commenter)
    if (job.createdBy.toString() !== user._id.toString()) {
      const jobCreator = await User.findById(job.createdBy);
      if (jobCreator) {
        await jobCreator.addNotification(
          'job_question',
          'New Question on Your Job',
          `${user.name} asked a question about "${job.title}". Check it out and respond.`,
          {
            jobId: job._id,
            commentId: newComment._id,
            fromUser: user._id
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Comment posted successfully',
      comment: newComment
    }, { status: 201 });

  } catch (error) {
    console.error('Post comment error:', error);
    return NextResponse.json(
      { message: 'Failed to post comment' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const job = await Job.findById(jobId)
      .select('comments')
      .populate('comments.author', 'name username photoURL')
      .populate('comments.replies.author', 'name username photoURL')
      .lean();

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      comments: job.comments || []
    });

  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// Reply to a comment
export async function PUT(request, { params }) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'comment_replies', 20, 60 * 60 * 1000); // 20 replies per hour
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many replies. Please try again later.' },
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
    const { commentId, message } = body;

    if (!jobId || !commentId || !message) {
      return NextResponse.json(
        { message: 'Job ID, comment ID, and message are required' },
        { status: 400 }
      );
    }

    if (message.trim().length > 500) {
      return NextResponse.json(
        { message: 'Reply cannot exceed 500 characters' },
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

    // Find the comment
    const comment = job.comments.id(commentId);
    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }

    // Add reply
    const reply = {
      author: user._id,
      message: message.trim(),
      createdAt: new Date()
    };

    comment.replies.push(reply);
    await job.save();

    // Populate for response
    await job.populate('comments.replies.author', 'name username photoURL');
    const updatedComment = job.comments.id(commentId);

    // Send notification to original commenter (if not the replier)
    if (comment.author.toString() !== user._id.toString()) {
      const originalCommenter = await User.findById(comment.author);
      if (originalCommenter) {
        await originalCommenter.addNotification(
          'comment_reply',
          'Reply to Your Question',
          `${user.name} replied to your question on "${job.title}".`,
          {
            jobId: job._id,
            commentId: comment._id,
            replyId: reply._id,
            fromUser: user._id
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reply posted successfully',
      comment: updatedComment
    });

  } catch (error) {
    console.error('Post reply error:', error);
    return NextResponse.json(
      { message: 'Failed to post reply' },
      { status: 500 }
    );
  }
}