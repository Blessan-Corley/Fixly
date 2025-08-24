// Production-grade notification service
import realtimeManager from './RealtimeManager.js';

class NotificationService {
  constructor() {
    this.notificationTypes = {
      JOB_APPLICATION: 'job_application',
      JOB_UPDATE: 'job_update',
      JOB_ACCEPTED: 'job_accepted',
      JOB_REJECTED: 'job_rejected',
      JOB_COMPLETED: 'job_completed',
      MESSAGE_RECEIVED: 'message_received',
      COMMENT_ADDED: 'comment_added',
      COMMENT_REPLY: 'comment_reply',
      PAYMENT_RECEIVED: 'payment_received',
      PROFILE_VIEW: 'profile_view',
      SYSTEM_ANNOUNCEMENT: 'system_announcement'
    };
    
    this.notificationPriorities = {
      LOW: 1,
      NORMAL: 2,
      HIGH: 3,
      URGENT: 4
    };
  }
  
  // Send job application notification
  async sendJobApplicationNotification(jobOwnerId, applicantId, jobId, jobTitle) {
    const notification = {
      id: this.generateNotificationId(),
      type: this.notificationTypes.JOB_APPLICATION,
      priority: this.notificationPriorities.HIGH,
      title: 'New Job Application',
      message: `Someone applied for your job: ${jobTitle}`,
      data: {
        jobId,
        applicantId,
        jobTitle
      },
      actions: [
        { id: 'view', label: 'View Application', url: `/dashboard/jobs/${jobId}/applications` },
        { id: 'profile', label: 'View Profile', url: `/profile/${applicantId}` }
      ],
      timestamp: Date.now(),
      read: false
    };
    
    // Send real-time notification
    realtimeManager.sendToUser(jobOwnerId, {
      type: 'notification',
      data: notification
    });
    
    // Store in database (implement based on your DB)
    await this.storeNotification(jobOwnerId, notification);
    
    return notification;
  }
  
  // Send job status update notification
  async sendJobStatusNotification(applicantId, jobId, jobTitle, status, message) {
    const typeMap = {
      'accepted': this.notificationTypes.JOB_ACCEPTED,
      'rejected': this.notificationTypes.JOB_REJECTED,
      'completed': this.notificationTypes.JOB_COMPLETED
    };
    
    const priorityMap = {
      'accepted': this.notificationPriorities.HIGH,
      'rejected': this.notificationPriorities.NORMAL,
      'completed': this.notificationPriorities.HIGH
    };
    
    const notification = {
      id: this.generateNotificationId(),
      type: typeMap[status] || this.notificationTypes.JOB_UPDATE,
      priority: priorityMap[status] || this.notificationPriorities.NORMAL,
      title: `Job ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: message || `Your application for "${jobTitle}" has been ${status}`,
      data: {
        jobId,
        jobTitle,
        status
      },
      actions: [
        { id: 'view', label: 'View Job', url: `/dashboard/jobs/${jobId}` }
      ],
      timestamp: Date.now(),
      read: false
    };
    
    // Send real-time notification
    realtimeManager.sendToUser(applicantId, {
      type: 'notification',
      data: notification
    });
    
    // Store in database
    await this.storeNotification(applicantId, notification);
    
    return notification;
  }
  
  // Send new message notification
  async sendMessageNotification(recipientId, senderId, senderName, messagePreview, conversationId) {
    const notification = {
      id: this.generateNotificationId(),
      type: this.notificationTypes.MESSAGE_RECEIVED,
      priority: this.notificationPriorities.NORMAL,
      title: `New message from ${senderName}`,
      message: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      data: {
        senderId,
        senderName,
        conversationId,
        messagePreview
      },
      actions: [
        { id: 'reply', label: 'Reply', url: `/dashboard/messages/${conversationId}` }
      ],
      timestamp: Date.now(),
      read: false
    };
    
    // Send real-time notification
    realtimeManager.sendToUser(recipientId, {
      type: 'notification',
      data: notification
    });
    
    // Store in database
    await this.storeNotification(recipientId, notification);
    
    return notification;
  }
  
  // Send comment notification
  async sendCommentNotification(recipientId, commenterId, commenterName, jobId, jobTitle, commentText) {
    const notification = {
      id: this.generateNotificationId(),
      type: this.notificationTypes.COMMENT_ADDED,
      priority: this.notificationPriorities.NORMAL,
      title: `New comment on ${jobTitle}`,
      message: `${commenterName} commented: ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`,
      data: {
        commenterId,
        commenterName,
        jobId,
        jobTitle,
        commentText
      },
      actions: [
        { id: 'view', label: 'View Comment', url: `/dashboard/jobs/${jobId}#comments` }
      ],
      timestamp: Date.now(),
      read: false
    };
    
    // Send real-time notification
    realtimeManager.sendToUser(recipientId, {
      type: 'notification',
      data: notification
    });
    
    // Store in database
    await this.storeNotification(recipientId, notification);
    
    return notification;
  }
  
  // Send payment notification
  async sendPaymentNotification(recipientId, amount, jobId, jobTitle, paymentId) {
    const notification = {
      id: this.generateNotificationId(),
      type: this.notificationTypes.PAYMENT_RECEIVED,
      priority: this.notificationPriorities.HIGH,
      title: 'Payment Received',
      message: `You received ₹${amount} for completing "${jobTitle}"`,
      data: {
        amount,
        jobId,
        jobTitle,
        paymentId
      },
      actions: [
        { id: 'view', label: 'View Payment', url: `/dashboard/payments/${paymentId}` }
      ],
      timestamp: Date.now(),
      read: false
    };
    
    // Send real-time notification
    realtimeManager.sendToUser(recipientId, {
      type: 'notification',
      data: notification
    });
    
    // Store in database
    await this.storeNotification(recipientId, notification);
    
    return notification;
  }
  
  // Send system announcement
  async sendSystemAnnouncement(userIds, title, message, url = null) {
    const notification = {
      id: this.generateNotificationId(),
      type: this.notificationTypes.SYSTEM_ANNOUNCEMENT,
      priority: this.notificationPriorities.NORMAL,
      title,
      message,
      data: {
        isSystemMessage: true,
        url
      },
      actions: url ? [{ id: 'view', label: 'Learn More', url }] : [],
      timestamp: Date.now(),
      read: false
    };
    
    // Send to all specified users or broadcast to all
    if (userIds && Array.isArray(userIds)) {
      for (const userId of userIds) {
        realtimeManager.sendToUser(userId, {
          type: 'notification',
          data: notification
        });
        await this.storeNotification(userId, notification);
      }
    } else {
      // Broadcast to all connected users
      realtimeManager.broadcast({
        type: 'notification',
        data: notification
      });
    }
    
    return notification;
  }
  
  // Send push notification (for PWA)
  async sendPushNotification(userId, notification) {
    // This would integrate with Web Push API
    // For now, we'll send it via SSE with push flag
    realtimeManager.sendToUser(userId, {
      type: 'push_notification',
      data: {
        ...notification,
        requiresPushPermission: true
      }
    });
  }
  
  // Mark notification as read
  async markAsRead(userId, notificationId) {
    // Update in database
    await this.updateNotificationStatus(userId, notificationId, { read: true, readAt: Date.now() });
    
    // Send real-time update
    realtimeManager.sendToUser(userId, {
      type: 'notification_read',
      data: { notificationId, read: true }
    });
  }
  
  // Mark all notifications as read
  async markAllAsRead(userId) {
    // Update in database
    await this.updateAllNotificationStatus(userId, { read: true, readAt: Date.now() });
    
    // Send real-time update
    realtimeManager.sendToUser(userId, {
      type: 'notifications_read_all',
      data: { allRead: true }
    });
  }
  
  // Get unread notification count
  async getUnreadCount(userId) {
    // This should query your database
    // For now, return mock data
    return Math.floor(Math.random() * 10);
  }
  
  // Generate unique notification ID
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Store notification in database (implement based on your DB)
  async storeNotification(userId, notification) {
    try {
      // TODO: Implement database storage
      console.log(`📝 Storing notification for user ${userId}:`, notification.title);
      
      // Example MongoDB implementation:
      /*
      const { MongoClient } = require('mongodb');
      const db = await MongoClient.connect(process.env.MONGODB_URI);
      await db.collection('notifications').insertOne({
        userId,
        ...notification
      });
      */
      
      return true;
    } catch (error) {
      console.error('Failed to store notification:', error);
      return false;
    }
  }
  
  // Update notification status
  async updateNotificationStatus(userId, notificationId, updates) {
    try {
      // TODO: Implement database update
      console.log(`📝 Updating notification ${notificationId} for user ${userId}:`, updates);
      return true;
    } catch (error) {
      console.error('Failed to update notification:', error);
      return false;
    }
  }
  
  // Update all notifications status
  async updateAllNotificationStatus(userId, updates) {
    try {
      // TODO: Implement database update
      console.log(`📝 Updating all notifications for user ${userId}:`, updates);
      return true;
    } catch (error) {
      console.error('Failed to update all notifications:', error);
      return false;
    }
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;