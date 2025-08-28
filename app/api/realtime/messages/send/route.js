// Message sending API endpoint
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import messageService from '../../../../../lib/realtime/MessageService.js';
import { rateLimit } from '../../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    // SECURITY: Authentication check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Rate limiting
    const rateLimitResult = await rateLimit(request, 'messaging', 50, 60 * 1000); // 50 messages per minute
    if (!rateLimitResult.success) {
      return Response.json({
        success: false,
        error: 'Too many messages. Please try again later.'
      }, { status: 429 });
    }

    const { 
      recipientId, 
      content, 
      type = 'text',
      metadata = {} 
    } = await request.json();
    
    // Use authenticated user ID instead of client-provided senderId
    const senderId = session.user.id;
    
    // Validate required fields
    if (!recipientId || !content) {
      return Response.json({
        success: false,
        error: 'Missing required fields: recipientId, content'
      }, { status: 400 });
    }
    
    // Validate message content
    if (typeof content !== 'string' || content.trim().length === 0) {
      return Response.json({
        success: false,
        error: 'Message content cannot be empty'
      }, { status: 400 });
    }
    
    // Check content length
    if (content.length > 10000) {
      return Response.json({
        success: false,
        error: 'Message content too long (max 10000 characters)'
      }, { status: 400 });
    }
    
    // Authentication already verified above
    
    console.log(`💬 Sending message from ${senderId} to ${recipientId}`);
    
    // Send the message
    const message = await messageService.sendMessage(
      senderId,
      recipientId,
      content.trim(),
      type,
      metadata
    );
    
    return Response.json({
      success: true,
      data: {
        messageId: message.id,
        conversationId: message.conversationId,
        timestamp: message.timestamp,
        delivered: message.delivered
      }
    });
    
  } catch (error) {
    console.error('Message send error:', error);
    
    return Response.json({
      success: false,
      error: 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}