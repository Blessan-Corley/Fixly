'use client';

import EventEmitter from 'events';

/**
 * Advanced Real-time Notification Manager
 * Provides seamless, instant notification delivery with zero polling
 */
class NotificationManager extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.subscribers = new Set();
    this.socket = null;
    this.isConnected = false;
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    this.missedNotifications = [];
    this.lastSyncTime = null;
    
    // Performance optimizations
    this.batchTimer = null;
    this.pendingUpdates = new Set();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Event listeners for lifecycle management
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Initialize connection with automatic reconnection
   */
  async initialize(socket) {
    try {
      this.socket = socket;
      this.setupSocketListeners();
      this.startHeartbeat();
      
      // Initial sync
      await this.syncNotifications();
      
      this.emit('initialized');
      console.log('🚀 NotificationManager initialized');
    } catch (error) {
      console.error('❌ NotificationManager initialization failed:', error);
      this.emit('error', error);
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.emit('connected');
      console.log('✅ Real-time notifications connected');
      
      // Sync any missed notifications
      this.syncMissedNotifications();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.emit('disconnected');
      console.log('🔌 Real-time notifications disconnected');
    });

    // Real-time notification events
    this.socket.on('notification:new', (notification) => {
      this.handleNewNotification(notification);
    });

    this.socket.on('notification:updated', (notification) => {
      this.handleNotificationUpdate(notification);
    });

    this.socket.on('notification:deleted', (notificationId) => {
      this.handleNotificationDeletion(notificationId);
    });

    this.socket.on('notification:bulk_read', (notificationIds) => {
      this.handleBulkRead(notificationIds);
    });

    // Sync events
    this.socket.on('notification:sync', (data) => {
      this.handleSync(data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('❌ Socket notification error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handle new notification with instant UI update
   */
  handleNewNotification(notification) {
    // Add to cache immediately
    this.cache.set(notification._id, notification);
    
    // Batch UI updates for performance
    this.batchUpdate(() => {
      this.emit('notification:added', notification);
      this.emit('count:changed', this.getUnreadCount());
    });

    // Show toast notification if tab is visible
    if (!document.hidden) {
      this.showToastNotification(notification);
    } else {
      this.missedNotifications.push(notification);
    }
  }

  /**
   * Handle notification update (mark as read, etc.)
   */
  handleNotificationUpdate(notification) {
    const existing = this.cache.get(notification._id);
    if (existing) {
      // Merge updates
      const updated = { ...existing, ...notification };
      this.cache.set(notification._id, updated);
      
      this.batchUpdate(() => {
        this.emit('notification:updated', updated);
        this.emit('count:changed', this.getUnreadCount());
      });
    }
  }

  /**
   * Handle notification deletion
   */
  handleNotificationDeletion(notificationId) {
    if (this.cache.has(notificationId)) {
      this.cache.delete(notificationId);
      
      this.batchUpdate(() => {
        this.emit('notification:deleted', notificationId);
        this.emit('count:changed', this.getUnreadCount());
      });
    }
  }

  /**
   * Handle bulk read operations
   */
  handleBulkRead(notificationIds) {
    let hasChanges = false;
    
    notificationIds.forEach(id => {
      const notification = this.cache.get(id);
      if (notification && !notification.read) {
        this.cache.set(id, { ...notification, read: true, readAt: new Date() });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.batchUpdate(() => {
        this.emit('notifications:bulk_updated', notificationIds);
        this.emit('count:changed', this.getUnreadCount());
      });
    }
  }

  /**
   * Handle sync from server
   */
  handleSync(data) {
    const { notifications, timestamp } = data;
    
    // Update cache
    notifications.forEach(notification => {
      this.cache.set(notification._id, notification);
    });
    
    this.lastSyncTime = timestamp;
    
    this.batchUpdate(() => {
      this.emit('notifications:synced', notifications);
      this.emit('count:changed', this.getUnreadCount());
    });
  }

  /**
   * Batch UI updates for performance
   */
  batchUpdate(callback) {
    this.pendingUpdates.add(callback);
    
    if (!this.batchTimer) {
      this.batchTimer = requestAnimationFrame(() => {
        this.pendingUpdates.forEach(cb => cb());
        this.pendingUpdates.clear();
        this.batchTimer = null;
      });
    }
  }

  /**
   * Show toast notification
   */
  showToastNotification(notification) {
    // Use the global toast system
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast({
        type: 'info',
        title: notification.title,
        message: notification.message,
        action: notification.actionUrl ? {
          label: 'View',
          onClick: () => window.location.href = notification.actionUrl
        } : null,
        duration: 5000
      });
    }
  }

  /**
   * Get all notifications from cache
   */
  getNotifications(filter = {}) {
    const notifications = Array.from(this.cache.values());
    
    // Apply filters
    let filtered = notifications;
    
    if (filter.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }
    
    if (filter.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }
    
    // Sort by creation date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get unread count
   */
  getUnreadCount() {
    return Array.from(this.cache.values()).filter(n => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    const notification = this.cache.get(notificationId);
    if (!notification || notification.read) return;

    // Optimistic update
    this.cache.set(notificationId, { 
      ...notification, 
      read: true, 
      readAt: new Date() 
    });

    this.batchUpdate(() => {
      this.emit('notification:updated', this.cache.get(notificationId));
      this.emit('count:changed', this.getUnreadCount());
    });

    // Queue API request
    this.queueRequest(async () => {
      try {
        const response = await fetch('/api/user/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId })
        });

        if (!response.ok) {
          throw new Error('Failed to mark as read');
        }

        // Emit via socket for other connected clients
        if (this.socket?.connected) {
          this.socket.emit('notification:mark_read', notificationId);
        }
      } catch (error) {
        // Revert optimistic update on error
        this.cache.set(notificationId, notification);
        this.emit('notification:updated', notification);
        this.emit('count:changed', this.getUnreadCount());
        this.emit('error', error);
      }
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const unreadNotifications = this.getNotifications({ unreadOnly: true });
    if (unreadNotifications.length === 0) return;

    const notificationIds = unreadNotifications.map(n => n._id);

    // Optimistic update
    unreadNotifications.forEach(notification => {
      this.cache.set(notification._id, {
        ...notification,
        read: true,
        readAt: new Date()
      });
    });

    this.batchUpdate(() => {
      this.emit('notifications:bulk_updated', notificationIds);
      this.emit('count:changed', 0);
    });

    // Queue API request
    this.queueRequest(async () => {
      try {
        const response = await fetch('/api/user/notifications', {
          method: 'PUT'
        });

        if (!response.ok) {
          throw new Error('Failed to mark all as read');
        }

        // Emit via socket for other connected clients
        if (this.socket?.connected) {
          this.socket.emit('notification:mark_all_read', notificationIds);
        }
      } catch (error) {
        // Revert optimistic updates on error
        unreadNotifications.forEach(notification => {
          this.cache.set(notification._id, notification);
        });
        this.emit('notifications:bulk_updated', notificationIds);
        this.emit('count:changed', this.getUnreadCount());
        this.emit('error', error);
      }
    });
  }

  /**
   * Queue API requests to prevent overwhelming the server
   */
  queueRequest(requestFn) {
    this.requestQueue.push(requestFn);
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      try {
        await request();
      } catch (error) {
        console.error('❌ Request queue error:', error);
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Sync notifications from server
   */
  async syncNotifications() {
    try {
      const response = await fetch('/api/user/notifications?limit=50');
      if (!response.ok) throw new Error('Sync failed');

      const data = await response.json();
      const { notifications } = data;

      // Update cache
      notifications.forEach(notification => {
        this.cache.set(notification._id, notification);
      });

      this.lastSyncTime = Date.now();
      
      this.emit('notifications:synced', notifications);
      this.emit('count:changed', this.getUnreadCount());
    } catch (error) {
      console.error('❌ Notification sync failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Sync missed notifications when coming back online
   */
  async syncMissedNotifications() {
    if (!this.lastSyncTime) return;

    try {
      const response = await fetch(`/api/user/notifications?since=${this.lastSyncTime}`);
      if (!response.ok) return;

      const data = await response.json();
      const { notifications } = data;

      if (notifications.length > 0) {
        notifications.forEach(notification => {
          this.handleNewNotification(notification);
        });
      }
    } catch (error) {
      console.error('❌ Missed notifications sync failed:', error);
    }
  }

  /**
   * Handle visibility change (tab focus/blur)
   */
  handleVisibilityChange() {
    if (!document.hidden && this.missedNotifications.length > 0) {
      // Show missed notifications
      this.missedNotifications.forEach(notification => {
        this.showToastNotification(notification);
      });
      this.missedNotifications = [];
    }
  }

  /**
   * Handle online/offline events
   */
  handleOnline() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
    this.syncMissedNotifications();
  }

  handleOffline() {
    // Socket.io will handle disconnection automatically
    this.emit('offline');
  }

  /**
   * Start heartbeat to ensure connection
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // 30 seconds
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear timers
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.batchTimer) {
      cancelAnimationFrame(this.batchTimer);
    }

    // Remove event listeners
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }

    // Clear caches
    this.cache.clear();
    this.subscribers.clear();
    this.pendingUpdates.clear();
    this.requestQueue.length = 0;

    // Remove all listeners
    this.removeAllListeners();

    console.log('🧹 NotificationManager destroyed');
  }
}

// Create singleton instance
let notificationManager = null;

export function getNotificationManager() {
  if (!notificationManager) {
    notificationManager = new NotificationManager();
  }
  return notificationManager;
}

export { NotificationManager };
export default getNotificationManager;