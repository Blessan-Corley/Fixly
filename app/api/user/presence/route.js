// User presence API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import presenceManager from '../../../../lib/realtime/PresenceManager';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userIds = searchParams.get('userIds')?.split(',').filter(Boolean);
    const action = searchParams.get('action') || 'single';

    switch (action) {
      case 'single':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          );
        }
        
        const presence = presenceManager.getUserPresence(userId);
        return NextResponse.json({
          success: true,
          data: presence
        });

      case 'multiple':
        if (!userIds || userIds.length === 0) {
          return NextResponse.json(
            { error: 'userIds are required' },
            { status: 400 }
          );
        }
        
        const presences = presenceManager.getUserPresences(userIds);
        return NextResponse.json({
          success: true,
          data: presences
        });

      case 'online':
        const onlineUsers = presenceManager.getOnlineUsers();
        return NextResponse.json({
          success: true,
          data: {
            users: onlineUsers,
            count: onlineUsers.length,
            timestamp: Date.now()
          }
        });

      case 'stats':
        const stats = presenceManager.getPresenceStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Presence API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'presence_update', 60, 60 * 1000); // 60 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many presence updates. Please try again later.' },
        { status: 429 }
      );
    }

    const { action, activity, connectionId, metadata } = await request.json();
    const userId = session.user.id;

    switch (action) {
      case 'connect':
        const connectionMetadata = {
          platform: metadata?.platform || 'web',
          userAgent: request.headers.get('user-agent') || '',
          ipAddress: getClientIP(request),
          ...metadata
        };
        
        const presence = presenceManager.addUserConnection(
          userId, 
          connectionId || `conn_${Date.now()}`, 
          connectionMetadata
        );
        
        return NextResponse.json({
          success: true,
          message: 'Connected to presence system',
          data: presence
        });

      case 'disconnect':
        presenceManager.removeUserConnection(
          userId, 
          connectionId || `conn_${Date.now()}`
        );
        
        return NextResponse.json({
          success: true,
          message: 'Disconnected from presence system'
        });

      case 'activity':
        presenceManager.updateUserActivity(userId, activity || {});
        
        return NextResponse.json({
          success: true,
          message: 'Activity updated',
          data: presenceManager.getUserPresence(userId)
        });

      case 'focus':
        presenceManager.handleWindowFocus(userId, activity?.focused || true);
        
        return NextResponse.json({
          success: true,
          message: 'Focus status updated'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Presence update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'bulk_presence', 10, 60 * 1000); // 10 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many bulk updates. Please try again later.' },
        { status: 429 }
      );
    }

    const { updates } = await request.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    // Validate that all updates are for the authenticated user
    const userId = session.user.id;
    const validUpdates = updates.filter(update => update.userId === userId);

    if (validUpdates.length !== updates.length) {
      return NextResponse.json(
        { error: 'Can only update own presence' },
        { status: 403 }
      );
    }

    const results = presenceManager.bulkUpdatePresence(validUpdates);

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} presence entries`,
      data: results
    });

  } catch (error) {
    console.error('Bulk presence update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get client IP
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  return forwarded?.split(',')[0]?.trim() || 
         realIP || 
         cfIP || 
         'unknown';
}