// Message status API (delivered, read, etc.)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import realtimeManager from '../../../../lib/realtime/RealtimeManager';
import connectDB from '../../../../lib/mongodb';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'message_status', 100, 60 * 1000); // 100 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many status updates. Please try again later.' },
        { status: 429 }
      );
    }

    const { messageId, status, conversationId } = await request.json();

    if (!messageId || !status) {
      return NextResponse.json(
        { error: 'messageId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['delivered', 'read'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be delivered or read' },
        { status: 400 }
      );
    }

    await connectDB();

    // Update message status in database
    const updated = await updateMessageStatus(messageId, status, session.user.id);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Message not found or permission denied' },
        { status: 404 }
      );
    }

    // Broadcast status update to sender
    if (updated.senderId !== session.user.id) {
      realtimeManager.sendToUser(updated.senderId, {
        type: `message:${status}`,
        messageId,
        status,
        timestamp: Date.now(),
        readBy: session.user.id
      }, { priority: 'normal', batch: true });
    }

    // If this is a read status update, also broadcast to conversation room
    if (status === 'read' && conversationId) {
      realtimeManager.broadcastToRoom(`conversation_${conversationId}`, {
        type: 'message:read',
        messageId,
        readBy: session.user.id,
        timestamp: Date.now()
      }, [session.user.id]); // Exclude sender
    }

    return NextResponse.json({
      success: true,
      message: `Message marked as ${status}`,
      data: {
        messageId,
        status,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('Message status error:', error);
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
    const messageId = searchParams.get('messageId');
    const conversationId = searchParams.get('conversationId');

    if (messageId) {
      // Get status for specific message
      const messageStatus = await getMessageStatus(messageId, session.user.id);
      
      return NextResponse.json({
        success: true,
        data: messageStatus
      });
    } else if (conversationId) {
      // Get status for all messages in conversation
      const conversationStatus = await getConversationMessageStatus(conversationId, session.user.id);
      
      return NextResponse.json({
        success: true,
        data: conversationStatus
      });
    } else {
      return NextResponse.json(
        { error: 'messageId or conversationId is required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Get message status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateMessageStatus(messageId, status, userId) {
  try {
    // Import Message model (assuming you have one)
    // For now, we'll simulate with a simple storage mechanism
    // In a real implementation, this would update your message database
    
    const { default: User } = await import('../../../../models/User');
    
    // Find the conversation/message in user's data
    // This is simplified - in reality you'd have a Message model
    const user = await User.findById(userId);
    if (!user) return null;

    // For demo purposes, we'll store message statuses in user document
    // In production, use a proper Message collection
    if (!user.messageStatuses) {
      user.messageStatuses = new Map();
    }
    
    user.messageStatuses.set(messageId, {
      status,
      updatedAt: new Date(),
      updatedBy: userId
    });
    
    await user.save();
    
    return {
      messageId,
      status,
      senderId: 'sender_id', // This would come from the message
      updatedAt: new Date()
    };

  } catch (error) {
    console.error('Error updating message status:', error);
    return null;
  }
}

async function getMessageStatus(messageId, userId) {
  try {
    const { default: User } = await import('../../../../models/User');
    
    const user = await User.findById(userId);
    if (!user || !user.messageStatuses) {
      return { messageId, status: 'sent' };
    }
    
    const statusData = user.messageStatuses.get(messageId);
    return {
      messageId,
      status: statusData?.status || 'sent',
      updatedAt: statusData?.updatedAt,
      updatedBy: statusData?.updatedBy
    };

  } catch (error) {
    console.error('Error getting message status:', error);
    return { messageId, status: 'sent' };
  }
}

async function getConversationMessageStatus(conversationId, userId) {
  try {
    // This would query all messages in a conversation and return their statuses
    // For now, return a simplified response
    return {
      conversationId,
      totalMessages: 0,
      unreadCount: 0,
      lastMessage: null,
      statuses: {}
    };

  } catch (error) {
    console.error('Error getting conversation status:', error);
    return {
      conversationId,
      error: 'Failed to get conversation status'
    };
  }
}