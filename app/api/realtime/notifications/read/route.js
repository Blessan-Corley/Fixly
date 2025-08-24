// Mark notification as read API endpoint
import notificationService from '../../../../../lib/realtime/NotificationService.js';

export async function POST(request) {
  try {
    const { userId, notificationId, markAll = false } = await request.json();
    
    // Validate required fields
    if (!userId || (!notificationId && !markAll)) {
      return Response.json({
        success: false,
        error: 'Missing required fields: userId and (notificationId or markAll)'
      }, { status: 400 });
    }
    
    if (markAll) {
      console.log(`📖 Marking all notifications as read for user ${userId}`);
      await notificationService.markAllAsRead(userId);
    } else {
      console.log(`📖 Marking notification ${notificationId} as read for user ${userId}`);
      await notificationService.markAsRead(userId, notificationId);
    }
    
    return Response.json({
      success: true,
      message: markAll ? 'All notifications marked as read' : 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Mark notification read error:', error);
    
    return Response.json({
      success: false,
      error: 'Failed to mark notification as read',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}