// API to send real-time messages
import realtimeManager from '../../../../lib/realtime';

export async function POST(request) {
  try {
    const { type, userId, data } = await request.json();
    
    if (!type || !userId) {
      return Response.json(
        { success: false, error: 'Type and userId required' },
        { status: 400 }
      );
    }
    
    switch (type) {
      case 'notification':
        realtimeManager.sendNotification(userId, data);
        break;
        
      case 'message':
        realtimeManager.sendMessageAlert(userId, data);
        break;
        
      case 'comment':
        realtimeManager.sendCommentUpdate(userId, data);
        break;
        
      case 'job_update':
        realtimeManager.sendJobUpdate(userId, data);
        break;
        
      case 'broadcast':
        realtimeManager.broadcast(data, userId);
        break;
        
      default:
        realtimeManager.sendToUser(userId, { type, data });
    }
    
    return Response.json({
      success: true,
      message: `${type} sent to user ${userId}`
    });
    
  } catch (error) {
    console.error('Realtime send error:', error);
    return Response.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}