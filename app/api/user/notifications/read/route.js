// app/api/user/notifications/read/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';
import { cache } from '../../../../../lib/cache';
import { getNotificationService } from '../../../../../lib/notifications';

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

    // Use the new notification service
    const notificationService = await getNotificationService();
    
    let idsToMark = [];
    if (notificationIds && Array.isArray(notificationIds)) {
      idsToMark = notificationIds;
    } else if (notificationId) {
      idsToMark = [notificationId];
    } else {
      // Mark all as read
      idsToMark = [];
    }

    const success = await notificationService.markAsRead(session.user.id, idsToMark);
    
    if (!success) {
      return NextResponse.json(
        { message: 'Failed to mark notifications as read' },
        { status: 500 }
      );
    }

    // Get updated unread count
    const unreadCount = await notificationService.getUnreadCount(session.user.id);

    // Invalidate cache for this user
    try {
      const cachePattern = `notifications:${session.user.id}:*`;
      await cache.invalidatePattern(cachePattern);
    } catch (cacheError) {
      console.log('Cache invalidation error:', cacheError.message);
    }

    const response = NextResponse.json({
      success: true,
      message: notificationIds 
        ? `${notificationIds.length} notification(s) marked as read`
        : 'Notification marked as read',
      unreadCount
    });

    // Set cache headers
    response.headers.set('Cache-Control', 'no-cache');
    
    return response;

  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { message: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}