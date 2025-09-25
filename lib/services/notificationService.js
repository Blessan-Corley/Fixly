/**
 * Real-time Notification Service
 * Integrates Ably, Redis, and ContentValidator for comprehensive notification system
 */

import { getServerAbly, CHANNELS, EVENTS, PRIORITY } from '@/lib/ably';
import { redisUtils } from '@/lib/redis';
import { ContentValidator } from '@/lib/validations/content-validator';

export class NotificationService {
  constructor() {
    this.ably = null;
    this.redis = redisUtils;
    this.initialized = false;
  }

  // Initialize Ably connection (server-side only)
  async initialize() {
    if (typeof window === 'undefined' && !this.initialized) {
      this.ably = getServerAbly();
      this.initialized = true;
      console.log('🔔 NotificationService initialized');
    }
  }

  /**
   * Send notification with validation, persistence, and real-time delivery
   */
  async sendNotification({
    type,
    recipientId,
    senderId = null,
    title,
    message,
    actionData = {},
    priority = PRIORITY.MEDIUM,
    channels = [],
    skipValidation = false,
    persistDays = 30
  }) {
    try {
      await this.initialize();

      // Validate notification content (unless skipped for system messages)
      if (!skipValidation && message) {
        const validation = await ContentValidator.validateContent(
          message,
          'notification',
          senderId
        );

        if (!validation.isValid) {
          console.warn('❌ Notification blocked due to content violation:', validation.violations);
          return { success: false, error: 'Content validation failed', violations: validation.violations };
        }
      }

      // Generate unique notification ID
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create notification object
      const notification = {
        id: notificationId,
        type,
        recipientId,
        senderId,
        title,
        message,
        actionData,
        priority,
        timestamp: new Date().toISOString(),
        read: false,
        delivered: false,
        clicked: false
      };

      // 1. Store in Redis for persistence
      await this.persistNotification(recipientId, notification, persistDays);

      // 2. Send real-time via Ably
      await this.broadcastNotification(recipientId, notification, channels);

      // 3. Update user notification counters
      await this.updateNotificationCounters(recipientId);

      // 4. Log notification for analytics
      await this.logNotificationEvent(notification, 'sent');

      console.log(`✅ Notification sent: ${type} to user ${recipientId}`);
      return { success: true, notificationId, notification };

    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Persist notification in Redis
   */
  async persistNotification(userId, notification, days = 30) {
    try {
      const key = `notifications:${userId}`;
      const ttl = days * 24 * 60 * 60; // Convert days to seconds

      // Add to user's notification list
      await this.redis.lpush(key, JSON.stringify(notification));
      await this.redis.expire(key, ttl);

      // Maintain max 100 notifications per user
      await this.redis.ltrim(key, 0, 99);

      // Store individual notification for quick access
      await this.redis.setex(`notification:${notification.id}`, ttl, JSON.stringify(notification));

    } catch (error) {
      console.error('Failed to persist notification:', error);
      throw error;
    }
  }

  /**
   * Broadcast notification via Ably with Web Push integration
   */
  async broadcastNotification(userId, notification, additionalChannels = []) {
    try {
      if (!this.ably) return;

      // Primary user notification channel
      const userChannel = this.ably.channels.get(CHANNELS.userNotifications(userId));
      await userChannel.publish(EVENTS.NOTIFICATION_SENT, notification);

      // Broadcast to additional channels if specified
      for (const channelName of additionalChannels) {
        const channel = this.ably.channels.get(channelName);
        await channel.publish(EVENTS.NOTIFICATION_SENT, notification);
      }

      // Send web push notification if high priority
      if (['high', 'critical'].includes(notification.priority)) {
        await this.sendWebPushNotification(userId, notification);
      }

      // Mark as delivered
      notification.delivered = true;
      await this.updateNotificationStatus(notification.id, { delivered: true });

    } catch (error) {
      console.error('Failed to broadcast notification:', error);
      throw error;
    }
  }

  /**
   * Send web push notification
   */
  async sendWebPushNotification(userId, notification) {
    try {
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          notification: {
            title: notification.title,
            body: notification.message,
            type: notification.type,
            url: this.getNotificationUrl(notification.actionData),
            urgent: notification.priority === 'critical',
            tag: `fixly_${notification.type}`,
            data: notification.actionData
          }
        })
      });

      if (response.ok) {
        console.log('✅ Web push notification sent');
      }
    } catch (error) {
      console.error('❌ Failed to send web push notification:', error);
    }
  }

  /**
   * Get notification URL based on action data
   */
  getNotificationUrl(actionData) {
    if (!actionData?.action) return '/dashboard';

    switch (actionData.action) {
      case 'view_job':
        return `/jobs/${actionData.jobId}`;
      case 'view_applications':
        return `/dashboard/jobs/${actionData.jobId}`;
      case 'open_chat':
        return `/dashboard/jobs/${actionData.jobId}/messages`;
      case 'view_comment':
        return `/jobs/${actionData.jobId}#comment-${actionData.commentId}`;
      case 'view_dashboard':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  }

  /**
   * Update notification counters for user
   */
  async updateNotificationCounters(userId) {
    try {
      const key = `user:${userId}:notification_count`;
      await this.redis.incr(key);
      await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      console.error('Failed to update notification counters:', error);
    }
  }

  /**
   * Update notification status (read, clicked, etc.)
   */
  async updateNotificationStatus(notificationId, updates) {
    try {
      const key = `notification:${notificationId}`;
      const notificationData = await this.redis.get(key);

      if (notificationData) {
        const notification = JSON.parse(notificationData);
        Object.assign(notification, updates, { updatedAt: new Date().toISOString() });

        await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(notification));

        // Update in user's notification list if needed
        if (updates.read) {
          await this.updateUserNotificationList(notification.recipientId, notificationId, updates);
        }
      }
    } catch (error) {
      console.error('Failed to update notification status:', error);
    }
  }

  /**
   * Update notification in user's list
   */
  async updateUserNotificationList(userId, notificationId, updates) {
    try {
      const key = `notifications:${userId}`;
      const notifications = await this.redis.lrange(key, 0, -1);

      const updatedNotifications = notifications.map(notifStr => {
        const notif = JSON.parse(notifStr);
        if (notif.id === notificationId) {
          Object.assign(notif, updates);
        }
        return JSON.stringify(notif);
      });

      // Replace the entire list
      await this.redis.del(key);
      if (updatedNotifications.length > 0) {
        await this.redis.rpush(key, ...updatedNotifications);
        await this.redis.expire(key, 30 * 24 * 60 * 60);
      }
    } catch (error) {
      console.error('Failed to update user notification list:', error);
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId, page = 1, limit = 20) {
    try {
      const key = `notifications:${userId}`;
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const notifications = await this.redis.lrange(key, start, end);
      const total = await this.redis.llen(key);

      return {
        notifications: notifications.map(n => JSON.parse(n)),
        total,
        page,
        limit,
        hasMore: end < total - 1
      };
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return { notifications: [], total: 0, page, limit, hasMore: false };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      await this.updateNotificationStatus(notificationId, { read: true });

      // Broadcast read status via Ably
      if (this.ably) {
        const channel = this.ably.channels.get(CHANNELS.userNotifications(userId));
        await channel.publish(EVENTS.NOTIFICATION_READ, { notificationId, timestamp: new Date().toISOString() });
      }

      // Log analytics
      await this.logNotificationEvent({ id: notificationId, recipientId: userId }, 'read');

      return { success: true };
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      const { notifications } = await this.getUserNotifications(userId, 1, 100);

      for (const notification of notifications) {
        if (!notification.read) {
          await this.updateNotificationStatus(notification.id, { read: true });
        }
      }

      // Broadcast bulk read status
      if (this.ably) {
        const channel = this.ably.channels.get(CHANNELS.userNotifications(userId));
        await channel.publish(EVENTS.NOTIFICATION_READ, {
          bulk: true,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      // Remove from individual storage
      await this.redis.del(`notification:${notificationId}`);

      // Remove from user's notification list
      const key = `notifications:${userId}`;
      const notifications = await this.redis.lrange(key, 0, -1);

      const filteredNotifications = notifications.filter(notifStr => {
        const notif = JSON.parse(notifStr);
        return notif.id !== notificationId;
      });

      await this.redis.del(key);
      if (filteredNotifications.length > 0) {
        await this.redis.rpush(key, ...filteredNotifications);
        await this.redis.expire(key, 30 * 24 * 60 * 60);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log notification events for analytics
   */
  async logNotificationEvent(notification, event) {
    try {
      const logKey = `notification_analytics:${new Date().toISOString().slice(0, 10)}`; // Daily logs
      const logEntry = {
        notificationId: notification.id,
        recipientId: notification.recipientId,
        type: notification.type,
        event,
        timestamp: new Date().toISOString()
      };

      await this.redis.lpush(logKey, JSON.stringify(logEntry));
      await this.redis.expire(logKey, 90 * 24 * 60 * 60); // Keep for 90 days
    } catch (error) {
      console.error('Failed to log notification event:', error);
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(days = 7) {
    try {
      const analytics = {
        totalSent: 0,
        totalRead: 0,
        totalClicked: 0,
        byType: {},
        byDay: {}
      };

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().slice(0, 10);
        const logKey = `notification_analytics:${dateKey}`;

        const logs = await this.redis.lrange(logKey, 0, -1);

        logs.forEach(logStr => {
          const log = JSON.parse(logStr);

          if (log.event === 'sent') analytics.totalSent++;
          if (log.event === 'read') analytics.totalRead++;
          if (log.event === 'clicked') analytics.totalClicked++;

          analytics.byType[log.type] = (analytics.byType[log.type] || 0) + 1;
          analytics.byDay[dateKey] = (analytics.byDay[dateKey] || 0) + 1;
        });
      }

      analytics.readRate = analytics.totalSent > 0 ? (analytics.totalRead / analytics.totalSent * 100).toFixed(2) : 0;
      analytics.clickRate = analytics.totalRead > 0 ? (analytics.totalClicked / analytics.totalRead * 100).toFixed(2) : 0;

      return analytics;
    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      return null;
    }
  }
}

// Pre-defined notification templates for consistency
export const NOTIFICATION_TEMPLATES = {
  // Job-related notifications
  JOB_APPLICATION_RECEIVED: {
    type: 'job_application',
    title: 'New Job Application',
    getMessage: (data) => `${data.fixerName} applied to your job "${data.jobTitle}"`,
    priority: PRIORITY.HIGH,
    actionData: (data) => ({ action: 'view_applications', jobId: data.jobId })
  },

  APPLICATION_ACCEPTED: {
    type: 'application_accepted',
    title: 'Application Accepted!',
    getMessage: (data) => `Congratulations! Your application for "${data.jobTitle}" was accepted`,
    priority: PRIORITY.CRITICAL,
    actionData: (data) => ({ action: 'view_job', jobId: data.jobId })
  },

  JOB_COMMENT: {
    type: 'job_comment',
    title: 'New Comment',
    getMessage: (data) => `${data.commenterName} commented on "${data.jobTitle}"`,
    priority: PRIORITY.MEDIUM,
    actionData: (data) => ({ action: 'view_comment', jobId: data.jobId, commentId: data.commentId })
  },

  COMMENT_REPLY: {
    type: 'comment_reply',
    title: 'Comment Reply',
    getMessage: (data) => `${data.replierName} replied to your comment`,
    priority: PRIORITY.MEDIUM,
    actionData: (data) => ({ action: 'view_reply', jobId: data.jobId, commentId: data.commentId })
  },

  COMMENT_LIKE: {
    type: 'comment_like',
    title: 'Comment Liked',
    getMessage: (data) => `${data.likerName} liked your comment`,
    priority: PRIORITY.LOW,
    actionData: (data) => ({ action: 'view_comment', jobId: data.jobId, commentId: data.commentId })
  },

  PRIVATE_MESSAGE: {
    type: 'private_message',
    title: 'New Message',
    getMessage: (data) => `${data.senderName}: ${data.messagePreview}`,
    priority: PRIORITY.HIGH,
    actionData: (data) => ({ action: 'open_chat', jobId: data.jobId, senderId: data.senderId })
  },

  JOB_STATUS_CHANGED: {
    type: 'job_status',
    title: 'Job Status Updated',
    getMessage: (data) => `"${data.jobTitle}" status changed to ${data.newStatus}`,
    priority: PRIORITY.HIGH,
    actionData: (data) => ({ action: 'view_job', jobId: data.jobId })
  },

  // System notifications
  WELCOME: {
    type: 'welcome',
    title: 'Welcome to Fixly!',
    getMessage: (data) => `Hi ${data.userName}! Welcome to Fixly. Start exploring jobs in your area.`,
    priority: PRIORITY.MEDIUM,
    actionData: () => ({ action: 'browse_jobs' })
  },

  SUBSCRIPTION_SUCCESS: {
    type: 'subscription',
    title: 'Pro Subscription Active',
    getMessage: (data) => 'Your Fixly Pro subscription is now active! Enjoy unlimited job posts.',
    priority: PRIORITY.HIGH,
    actionData: () => ({ action: 'view_dashboard' })
  }
};

// Helper function to send templated notifications
export async function sendTemplatedNotification(templateKey, recipientId, templateData, options = {}) {
  const service = new NotificationService();
  const template = NOTIFICATION_TEMPLATES[templateKey];

  if (!template) {
    throw new Error(`Unknown notification template: ${templateKey}`);
  }

  return await service.sendNotification({
    type: template.type,
    recipientId,
    title: template.title,
    message: template.getMessage(templateData),
    priority: template.priority,
    actionData: template.actionData(templateData),
    ...options
  });
}

// Export singleton instance
export const notificationService = new NotificationService();