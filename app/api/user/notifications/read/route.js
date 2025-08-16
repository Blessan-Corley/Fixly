// app/api/user/notifications/read/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'mark_read', 60, 60 * 1000);
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

    const body = await request.json();
    const { notificationId, notificationIds } = body;

    if (!notificationId && (!notificationIds || !Array.isArray(notificationIds))) {
      return NextResponse.json(
        { message: 'Notification ID or array of IDs required' },
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

    // Handle single notification
    if (notificationId) {
      const notification = user.notifications.id(notificationId);
      if (notification) {
        notification.read = true;
        notification.readAt = new Date();
      }
    }

    // Handle multiple notifications
    if (notificationIds && Array.isArray(notificationIds)) {
      notificationIds.forEach(id => {
        const notification = user.notifications.id(id);
        if (notification) {
          notification.read = true;
          notification.readAt = new Date();
        }
      });
    }

    await user.save();

    // Count remaining unread notifications
    const unreadCount = user.notifications.filter(notif => !notif.read).length;

    return NextResponse.json({
      success: true,
      message: 'Notification(s) marked as read',
      unreadCount
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { message: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}