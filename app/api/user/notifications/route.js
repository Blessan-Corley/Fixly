// app/api/user/notifications/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { rateLimit } from '../../../../utils/rateLimiting';
import { cache } from '../../../../lib/cache';
import { getNotificationService, NOTIFICATION_CATEGORIES } from '../../../../lib/notifications';

// Cache configuration
const CACHE_TTL = 60; // 1 minute cache for notifications
const CACHE_KEY_PREFIX = 'notifications:';

export async function GET(request) {
  try {
    // Apply rate limiting with higher limits for authenticated users
    const rateLimitResult = await rateLimit(request, 'notifications', 120, 60 * 1000);
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 50);
    const offset = (page - 1) * limit;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const category = searchParams.get('category');
    const since = searchParams.get('since');

    // Create cache key
    const cacheKey = `${CACHE_KEY_PREFIX}${session.user.id}:${page}:${limit}:${unreadOnly}:${category}:${since || 'all'}`;

    // Try to get from cache first
    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        const response = NextResponse.json(cachedData);
        response.headers.set('X-Cache', 'HIT');
        response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
        return response;
      }
    } catch (cacheError) {
      console.log('Cache miss or error:', cacheError.message);
    }

    // Use the new notification service
    const notificationService = await getNotificationService();
    const result = await notificationService.getUserNotifications(session.user.id, {
      limit,
      offset,
      category,
      unreadOnly
    });

    const responseData = {
      notifications: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasMore: result.hasMore
      },
      unreadCount: result.unreadCount,
      categories: Object.values(NOTIFICATION_CATEGORIES),
      timestamp: Date.now()
    };

    // Cache the response
    try {
      await cache.set(cacheKey, responseData, CACHE_TTL);
    } catch (cacheError) {
      console.log('Cache set error:', cacheError.message);
    }

    const response = NextResponse.json(responseData);
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    response.headers.set('ETag', `"${session.user.id}-${Date.now()}"`);
    
    return response;

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'create_notification', 60, 60 * 1000);
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
    const { userId, type, title, message, data, actionUrl } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { message: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    const targetUserId = userId || session.user.id;

    await connectDB();

    // Create notification object
    const notification = {
      _id: new Date().getTime().toString(),
      type,
      title,
      message,
      data: data || {},
      actionUrl,
      read: false,
      createdAt: new Date(),
      priority: getPriorityByType(type)
    };

    // Use atomic operation for better performance
    const updateResult = await User.updateOne(
      { _id: targetUserId },
      { 
        $push: { 
          notifications: {
            $each: [notification],
            $position: 0,
            $slice: 100 // Keep only latest 100 notifications
          }
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Invalidate cache for this user
    try {
      const cachePattern = `${CACHE_KEY_PREFIX}${targetUserId}:*`;
      await cache.invalidatePattern(cachePattern);
    } catch (cacheError) {
      console.log('Cache invalidation error:', cacheError.message);
    }

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { message: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// Helper function to determine notification priority
function getPriorityByType(type) {
  const highPriority = ['payment_received', 'job_assigned', 'application_accepted'];
  const mediumPriority = ['job_applied', 'message', 'job_completed'];
  
  if (highPriority.includes(type)) return 'high';
  if (mediumPriority.includes(type)) return 'medium';
  return 'low';
}

export async function PUT(request) {
  try {
    // Mark all notifications as read with optimized query
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Use atomic operation to mark all notifications as read
    const updateResult = await User.updateOne(
      { _id: session.user.id },
      { 
        $set: { 
          'notifications.$[].read': true,
          'notifications.$[].readAt': new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Invalidate cache for this user
    try {
      const cachePattern = `${CACHE_KEY_PREFIX}${session.user.id}:*`;
      await cache.invalidatePattern(cachePattern);
    } catch (cacheError) {
      console.log('Cache invalidation error:', cacheError.message);
    }

    const response = NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });

    // Set cache headers
    response.headers.set('Cache-Control', 'no-cache');
    
    return response;

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json(
      { message: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}