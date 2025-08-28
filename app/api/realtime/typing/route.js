// Typing indicators API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import presenceManager from '../../../../lib/realtime/PresenceManager';
import realtimeManager from '../../../../lib/realtime/RealtimeManager';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting for typing indicators
    const rateLimitResult = await rateLimit(request, 'typing', 30, 60 * 1000); // 30 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many typing updates. Please try again later.' },
        { status: 429 }
      );
    }

    const { action, conversationId, recipientId } = await request.json();

    if (!action || !conversationId) {
      return NextResponse.json(
        { error: 'Action and conversationId are required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const isTyping = action === 'start';

    // Update presence with typing status
    presenceManager.setTypingStatus(userId, conversationId, isTyping);

    // Broadcast typing status to conversation participants
    if (recipientId) {
      realtimeManager.sendToUser(recipientId, {
        type: `typing:${action}`,
        userId,
        conversationId,
        isTyping,
        timestamp: Date.now()
      }, { priority: 'high' });
    }

    // Also broadcast to conversation room
    realtimeManager.broadcastToRoom(`conversation_${conversationId}`, {
      type: `typing:${action}`,
      userId,
      conversationId,
      isTyping,
      timestamp: Date.now()
    }, [userId]); // Exclude sender

    return NextResponse.json({
      success: true,
      message: `Typing status ${action}ed`,
      data: {
        userId,
        conversationId,
        isTyping,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Typing API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Get typing users in conversation
    const typingUsers = presenceManager.getTypingUsers(conversationId);

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        typingUsers,
        count: typingUsers.length
      }
    });

  } catch (error) {
    console.error('Get typing users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}