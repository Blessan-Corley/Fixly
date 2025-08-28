// Leave real-time room API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import realtimeManager from '../../../../lib/realtime/RealtimeManager';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'room_leave', 30, 60 * 1000); // 30 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many room leave attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { roomId, userId: providedUserId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    // Security: Only allow leaving with own user ID
    const userId = session.user.id;
    if (providedUserId && providedUserId !== userId) {
      return NextResponse.json(
        { error: 'Can only leave rooms with your own user ID' },
        { status: 403 }
      );
    }

    // Leave the room
    realtimeManager.leaveRoom(userId, roomId);

    return NextResponse.json({
      success: true,
      message: `Left room ${roomId}`,
      data: {
        roomId,
        userId,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Leave room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}