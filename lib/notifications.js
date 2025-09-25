// lib/notifications.js - Comprehensive notification system
import { getRedisClient } from './cache';
import connectDB from './db';
import User from '../models/User';

// Notification types and categories
export const NOTIFICATION_TYPES = {
  // Job-related notifications
  JOB_APPLICATION: 'job_application',
  JOB_STATUS_UPDATE: 'job_status_update',
  JOB_COMPLETED: 'job_completed',
  JOB_CANCELLED: 'job_cancelled',
  
  // Message notifications
  NEW_MESSAGE: 'new_message',
  
  // Social interactions
  COMMENT_LIKE: 'comment_like',
  PROFILE_VIEW: 'profile_view',
  
  // System notifications
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  VERIFICATION_UPDATE: 'verification_update',
  ACCOUNT_UPDATE: 'account_update',
  
  // Review and rating
  NEW_REVIEW: 'new_review',
  RATING_UPDATE: 'rating_update'
};

// Notification priorities
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal', 
  HIGH: 'high',
  URGENT: 'urgent'
};

// Notification categories for filtering
export const NOTIFICATION_CATEGORIES = {
  JOBS: 'jobs',
  MESSAGES: 'messages', 
  SOCIAL: 'social',
  PAYMENTS: 'payments',
  SYSTEM: 'system',
  REVIEWS: 'reviews'
};

// Category mapping
const TYPE_TO_CATEGORY = {
  [NOTIFICATION_TYPES.JOB_APPLICATION]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.JOB_STATUS_UPDATE]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.JOB_COMPLETED]: NOTIFICATION_CATEGORIES.JOBS,
  [NOTIFICATION_TYPES.JOB_CANCELLED]: NOTIFICATION_CATEGORIES.JOBS,
  
  [NOTIFICATION_TYPES.NEW_MESSAGE]: NOTIFICATION_CATEGORIES.MESSAGES,
  
  [NOTIFICATION_TYPES.COMMENT_LIKE]: NOTIFICATION_CATEGORIES.SOCIAL,
  [NOTIFICATION_TYPES.PROFILE_VIEW]: NOTIFICATION_CATEGORIES.SOCIAL,
  
  [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: NOTIFICATION_CATEGORIES.PAYMENTS,
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: NOTIFICATION_CATEGORIES.PAYMENTS,
  [NOTIFICATION_TYPES.VERIFICATION_UPDATE]: NOTIFICATION_CATEGORIES.SYSTEM,
  [NOTIFICATION_TYPES.ACCOUNT_UPDATE]: NOTIFICATION_CATEGORIES.SYSTEM,
  
  [NOTIFICATION_TYPES.NEW_REVIEW]: NOTIFICATION_CATEGORIES.REVIEWS,
  [NOTIFICATION_TYPES.RATING_UPDATE]: NOTIFICATION_CATEGORIES.REVIEWS
};

// Notification templates
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.JOB_APPLICATION]: {
    title: 'New Application Received',
    body: '{applicantName} applied for your job "{jobTitle}"',
    priority: NOTIFICATION_PRIORITY.HIGH,
    icon: '👷‍♂️',
    actionUrl: '/dashboard/jobs/{jobId}',
    pushEnabled: true
  },
  
  [NOTIFICATION_TYPES.JOB_STATUS_UPDATE]: {
    title: 'Job Status Updated',
    body: 'Your job "{jobTitle}" status changed to {status}',
    priority: NOTIFICATION_PRIORITY.NORMAL,
    icon: '📝',
    actionUrl: '/dashboard/jobs/{jobId}',
    pushEnabled: true
  },
  
  [NOTIFICATION_TYPES.JOB_COMPLETED]: {
    title: 'Job Completed',
    body: 'Great! "{jobTitle}" has been marked as completed',
    priority: NOTIFICATION_PRIORITY.HIGH,
    icon: '✅',
    actionUrl: '/dashboard/jobs/{jobId}/review',
    pushEnabled: true
  },
  
  [NOTIFICATION_TYPES.NEW_MESSAGE]: {
    title: 'New Message',
    body: '{senderName} sent you a message',
    priority: NOTIFICATION_PRIORITY.HIGH,
    icon: '💬',
    actionUrl: '/dashboard/messages',
    pushEnabled: true
  },
  
  [NOTIFICATION_TYPES.COMMENT_LIKE]: {
    title: 'Comment Liked',
    body: '{likerName} liked your comment',
    priority: NOTIFICATION_PRIORITY.LOW,
    icon: '❤️',
    actionUrl: '/dashboard/jobs/{jobId}',
    pushEnabled: false
  },
  
  [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: {
    title: 'Payment Successful',
    body: 'Payment of ₹{amount} processed successfully',
    priority: NOTIFICATION_PRIORITY.HIGH,
    icon: '💳',
    actionUrl: '/dashboard/subscription',
    pushEnabled: true
  },
  
  [NOTIFICATION_TYPES.NEW_REVIEW]: {
    title: 'New Review Received',
    body: '{reviewerName} left you a {rating}-star review',
    priority: NOTIFICATION_PRIORITY.NORMAL,
    icon: '⭐',
    actionUrl: '/dashboard/profile',
    pushEnabled: true
  }
};

// Main notification service class
export class NotificationService {
  constructor() {
    this.redis = null;
  }

  async init() {
    this.redis = await getRedisClient();
    return this;
  }

  // Create and send notification
  async createNotification({
    userId,
    type,
    data = {},
    priority = NOTIFICATION_PRIORITY.NORMAL,
    scheduledFor = null
  }) {
    try {
      await connectDB();
      
      const template = NOTIFICATION_TEMPLATES[type];
      if (!template) {
        throw new Error(`Unknown notification type: ${type}`);
      }

      // Generate notification content
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type,
        category: TYPE_TO_CATEGORY[type],
        title: this.processTemplate(template.title, data),
        body: this.processTemplate(template.body, data),
        priority: priority || template.priority,
        icon: template.icon,
        actionUrl: this.processTemplate(template.actionUrl, data),
        data: data,
        read: false,
        createdAt: new Date(),
        scheduledFor: scheduledFor || new Date()
      };

      // Store in database
      const user = await User.findById(userId);
      if (user) {
        // Check user preferences
        const shouldSend = this.checkUserPreferences(user, type);
        
        if (shouldSend) {
          // Add to user's notifications
          user.notifications = user.notifications || [];
          user.notifications.unshift(notification);
          
          // Keep only last 100 notifications
          if (user.notifications.length > 100) {
            user.notifications = user.notifications.slice(0, 100);
          }
          
          await user.save();

          // Send real-time notification
          await this.sendRealTimeNotification(userId, notification);

          // Send push notification if enabled
          if (template.pushEnabled && user.pushSubscription) {
            await this.sendPushNotification(user, notification);
          }

          // Cache for quick access
          if (this.redis) {
            await this.cacheNotification(userId, notification);
          }

          return notification;
        }
      }

      return null;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Process template strings
  processTemplate(template, data) {
    if (!template) return '';
    
    let processed = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      processed = processed.replace(regex, data[key] || '');
    });
    
    return processed;
  }

  // Check user notification preferences
  checkUserPreferences(user, type) {
    const category = TYPE_TO_CATEGORY[type];
    const preferences = user.preferences || {};
    
    // Default to enabled for all categories
    const categoryPrefs = {
      [NOTIFICATION_CATEGORIES.JOBS]: preferences.jobNotifications !== false,
      [NOTIFICATION_CATEGORIES.MESSAGES]: preferences.messageNotifications !== false,
      [NOTIFICATION_CATEGORIES.SOCIAL]: preferences.socialNotifications !== false,
      [NOTIFICATION_CATEGORIES.PAYMENTS]: preferences.paymentNotifications !== false,
      [NOTIFICATION_CATEGORIES.SYSTEM]: preferences.systemNotifications !== false,
      [NOTIFICATION_CATEGORIES.REVIEWS]: preferences.reviewNotifications !== false
    };

    return categoryPrefs[category] && preferences.emailNotifications !== false;
  }

  // Send real-time notification via Ably
  async sendRealTimeNotification(userId, notification) {
    try {
      const { getServerAbly, CHANNELS, EVENTS } = await import('./ably');
      const ably = getServerAbly();

      if (ably) {
        // Send to user's notification channel
        const channel = ably.channels.get(CHANNELS.userNotifications(userId));

        await channel.publish(EVENTS.NOTIFICATION_SENT, {
          ...notification,
          timestamp: new Date().toISOString()
        });

        // Send notification count update
        const unreadCount = await this.getUnreadCount(userId);
        await channel.publish('notification_count_updated', {
          userId,
          unreadCount,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending real-time notification via Ably:', error);
    }
  }

  // Send push notification
  async sendPushNotification(user, notification) {
    try {
      if (!user.pushSubscription) return;

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: notification.type,
        data: {
          url: notification.actionUrl,
          notificationId: notification.id
        },
        actions: [
          {
            action: 'view',
            title: 'View',
            icon: '/icon-view.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icon-dismiss.png'
          }
        ]
      });

      // Send push notification (this would integrate with your push service)
      // For now, we'll use the service worker messaging
      const clients = await self.clients?.matchAll();
      if (clients) {
        clients.forEach(client => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION',
            payload: JSON.parse(payload)
          });
        });
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Cache notification for quick access
  async cacheNotification(userId, notification) {
    if (!this.redis) return;

    try {
      const key = `notifications:${userId}`;
      
      // Add to sorted set with timestamp as score
      await this.redis.zAdd(key, {
        score: Date.now(),
        value: JSON.stringify(notification)
      });

      // Keep only last 50 notifications in cache
      await this.redis.zRemRangeByRank(key, 0, -51);
      
      // Set expiration (7 days)
      await this.redis.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      console.error('Error caching notification:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId, { limit = 20, offset = 0, category = null, unreadOnly = false } = {}) {
    try {
      await connectDB();
      const user = await User.findById(userId);
      
      if (!user || !user.notifications) {
        return { notifications: [], total: 0, unreadCount: 0 };
      }

      let notifications = [...user.notifications];

      // Filter by category
      if (category) {
        notifications = notifications.filter(n => n.category === category);
      }

      // Filter by read status
      if (unreadOnly) {
        notifications = notifications.filter(n => !n.read);
      }

      const total = notifications.length;
      const unreadCount = user.notifications.filter(n => !n.read).length;

      // Apply pagination
      notifications = notifications.slice(offset, offset + limit);

      return {
        notifications,
        total,
        unreadCount,
        hasMore: total > offset + limit
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  }

  // Mark notifications as read
  async markAsRead(userId, notificationIds = []) {
    try {
      await connectDB();
      const user = await User.findById(userId);
      
      if (!user || !user.notifications) return false;

      let updated = false;
      user.notifications.forEach(notification => {
        if (notificationIds.length === 0 || notificationIds.includes(notification.id)) {
          if (!notification.read) {
            notification.read = true;
            notification.readAt = new Date();
            updated = true;
          }
        }
      });

      if (updated) {
        await user.save();
        
        // Update real-time count via Ably
        const unreadCount = await this.getUnreadCount(userId);
        try {
          const { getServerAbly, CHANNELS } = await import('./ably');
          const ably = getServerAbly();

          if (ably) {
            const channel = ably.channels.get(CHANNELS.userNotifications(userId));
            await channel.publish('notification_count_updated', {
              userId,
              unreadCount,
              timestamp: new Date().toISOString()
            });
          }
        } catch (ablyError) {
          console.error('Error updating notification count via Ably:', ablyError);
        }
      }

      return updated;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }
  }

  // Get unread count
  async getUnreadCount(userId) {
    try {
      await connectDB();
      const user = await User.findById(userId);
      
      if (!user || !user.notifications) return 0;
      
      return user.notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Bulk notification sender for system-wide notifications
  async sendBulkNotification({
    userIds = [],
    type,
    data = {},
    priority = NOTIFICATION_PRIORITY.NORMAL
  }) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.createNotification({
          userId,
          type,
          data,
          priority
        });
        results.push({ userId, success: true, notification });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }
}

// Create singleton instance
let notificationServiceInstance = null;

export async function getNotificationService() {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
    await notificationServiceInstance.init();
  }
  return notificationServiceInstance;
}

// Helper functions for common notification types
export async function notifyJobApplication(jobId, jobTitle, applicantId, applicantName, hirerId) {
  const service = await getNotificationService();
  return service.createNotification({
    userId: hirerId,
    type: NOTIFICATION_TYPES.JOB_APPLICATION,
    data: {
      jobId,
      jobTitle,
      applicantId,
      applicantName
    },
    priority: NOTIFICATION_PRIORITY.HIGH
  });
}

export async function notifyNewMessage(senderId, senderName, receiverId, conversationId) {
  const service = await getNotificationService();
  return service.createNotification({
    userId: receiverId,
    type: NOTIFICATION_TYPES.NEW_MESSAGE,
    data: {
      senderId,
      senderName,
      conversationId
    },
    priority: NOTIFICATION_PRIORITY.HIGH
  });
}

export async function notifyJobStatusUpdate(userId, jobId, jobTitle, status) {
  const service = await getNotificationService();
  return service.createNotification({
    userId,
    type: NOTIFICATION_TYPES.JOB_STATUS_UPDATE,
    data: {
      jobId,
      jobTitle,
      status
    },
    priority: NOTIFICATION_PRIORITY.NORMAL
  });
}

export async function notifyPaymentSuccess(userId, amount, planType) {
  const service = await getNotificationService();
  return service.createNotification({
    userId,
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    data: {
      amount,
      planType
    },
    priority: NOTIFICATION_PRIORITY.HIGH
  });
}

export async function notifyNewReview(userId, reviewerId, reviewerName, rating, jobId) {
  const service = await getNotificationService();
  return service.createNotification({
    userId,
    type: NOTIFICATION_TYPES.NEW_REVIEW,
    data: {
      reviewerId,
      reviewerName,
      rating,
      jobId
    },
    priority: NOTIFICATION_PRIORITY.NORMAL
  });
}