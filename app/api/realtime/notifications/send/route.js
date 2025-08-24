// Send notification API endpoint
import notificationService from '../../../../../lib/realtime/NotificationService.js';

export async function POST(request) {
  try {
    const { 
      userId, 
      type, 
      title, 
      message, 
      data = {},
      priority = 2 
    } = await request.json();
    
    // Validate required fields
    if (!userId || !title || !message) {
      return Response.json({
        success: false,
        error: 'Missing required fields: userId, title, message'
      }, { status: 400 });
    }
    
    console.log(`📬 Sending notification to user ${userId}: ${title}`);
    
    let notification;
    
    // Handle different notification types
    switch (type) {
      case 'job_application':
        notification = await notificationService.sendJobApplicationNotification(
          userId,
          data.applicantId,
          data.jobId,
          data.jobTitle
        );
        break;
        
      case 'job_status':
        notification = await notificationService.sendJobStatusNotification(
          userId,
          data.jobId,
          data.jobTitle,
          data.status,
          message
        );
        break;
        
      case 'message':
        notification = await notificationService.sendMessageNotification(
          userId,
          data.senderId,
          data.senderName,
          message,
          data.conversationId
        );
        break;
        
      case 'comment':
        notification = await notificationService.sendCommentNotification(
          userId,
          data.commenterId,
          data.commenterName,
          data.jobId,
          data.jobTitle,
          message
        );
        break;
        
      case 'payment':
        notification = await notificationService.sendPaymentNotification(
          userId,
          data.amount,
          data.jobId,
          data.jobTitle,
          data.paymentId
        );
        break;
        
      case 'system':
        notification = await notificationService.sendSystemAnnouncement(
          [userId],
          title,
          message,
          data.url
        );
        break;
        
      default:
        // Generic notification
        notification = {
          id: notificationService.generateNotificationId(),
          type: type || 'general',
          priority,
          title,
          message,
          data,
          timestamp: Date.now(),
          read: false
        };
        
        // Send via realtime manager
        const realtimeManager = (await import('../../../../../lib/realtime/RealtimeManager.js')).default;
        realtimeManager.sendToUser(userId, {
          type: 'notification',
          data: notification
        });
        
        // Store in database
        await notificationService.storeNotification(userId, notification);
    }
    
    return Response.json({
      success: true,
      data: {
        notificationId: notification.id,
        timestamp: notification.timestamp
      }
    });
    
  } catch (error) {
    console.error('Notification send error:', error);
    
    return Response.json({
      success: false,
      error: 'Failed to send notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}