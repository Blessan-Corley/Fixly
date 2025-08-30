// app/api/notifications/mark-read/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';
import { validateAndSanitize, addSecurityHeaders } from '@/utils/validation';

export const dynamic = 'force-dynamic';

// POST /api/notifications/mark-read - Mark notifications as read
export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 100, 15 * 60 * 1000);
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

    // Parse request body
    const body = await request.json();
    const { notificationIds, markAll = false } = body;

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    let updatedCount = 0;

    if (markAll) {
      // Mark all notifications as read
      user.notifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
          updatedCount++;
        }
      });
    } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      notificationIds.forEach(notificationId => {
        const notification = user.notifications.id(notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          updatedCount++;
        }
      });
    } else {
      return NextResponse.json(
        { message: 'No notification IDs provided and markAll is false' },
        { status: 400 }
      );
    }

    // Save user with updated notifications
    await user.save();

    const response = NextResponse.json({
      success: true,
      message: `${updatedCount} notification${updatedCount !== 1 ? 's' : ''} marked as read`,
      updatedCount,
      unreadCount: user.notifications.filter(n => !n.read).length
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Mark notifications read error:', error);
    const response = NextResponse.json(
      { message: 'Failed to update notifications' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// GET /api/notifications/mark-read - Get unread notification count
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 200, 15 * 60 * 1000);
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

    // Get user with notifications
    const user = await User.findById(session.user.id).select('notifications');
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const unreadCount = user.notifications.filter(n => !n.read).length;
    const totalCount = user.notifications.length;

    const response = NextResponse.json({
      success: true,
      unreadCount,
      totalCount,
      hasUnread: unreadCount > 0
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Get notification count error:', error);
    const response = NextResponse.json(
      { message: 'Failed to get notification count' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// DELETE /api/notifications/mark-read - Delete old read notifications
export async function DELETE(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'api_requests', 50, 15 * 60 * 1000);
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

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Delete read notifications older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const initialCount = user.notifications.length;

    user.notifications = user.notifications.filter(notification => {
      // Keep unread notifications
      if (!notification.read) return true;
      // Keep read notifications that are less than 30 days old
      return notification.createdAt > thirtyDaysAgo;
    });

    const deletedCount = initialCount - user.notifications.length;

    // Save user
    await user.save();

    const response = NextResponse.json({
      success: true,
      message: `${deletedCount} old notification${deletedCount !== 1 ? 's' : ''} deleted`,
      deletedCount,
      remainingCount: user.notifications.length
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Delete old notifications error:', error);
    const response = NextResponse.json(
      { message: 'Failed to delete old notifications' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}