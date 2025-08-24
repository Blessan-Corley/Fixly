// Message sending API endpoint
import messageService from '../../../../../lib/realtime/MessageService.js';

export async function POST(request) {
  try {
    const { 
      senderId, 
      recipientId, 
      content, 
      type = 'text',
      metadata = {} 
    } = await request.json();
    
    // Validate required fields
    if (!senderId || !recipientId || !content) {
      return Response.json({
        success: false,
        error: 'Missing required fields: senderId, recipientId, content'
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
    
    // TODO: Validate user permissions and authentication
    // const isAuthorized = await validateUserAuth(senderId, request);
    // if (!isAuthorized) {
    //   return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }
    
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