// Comprehensive Push Notification Manager
'use client';

class PushNotificationManager {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = 'default';
    this.subscription = null;
    this.vapidPublicKey = null;
    this.eventEmitter = null;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.healthCheckInterval = null;
    this.lastHealthCheck = null;
    
    // Clean, simple notification templates
    this.notificationTemplates = {
      job_match: {
        title: 'New Job Match',
        body: 'A job matching your skills is nearby',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'job-match',
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Later' }
        ]
      },
      message_received: {
        title: 'New Message',
        body: 'You have a new message',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'message',
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Later' }
        ]
      },
      job_application: {
        title: 'New Application',
        body: 'Someone applied to your job',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'application',
        actions: [
          { action: 'review', title: 'Review' },
          { action: 'dismiss', title: 'Later' }
        ]
      },
      payment_received: {
        title: 'Payment Received',
        body: 'You received a payment',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'payment',
        actions: [
          { action: 'view', title: 'View' }
        ]
      },
      system_update: {
        title: 'Update Available',
        body: 'New version ready',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'system',
        actions: [
          { action: 'update', title: 'Update' },
          { action: 'later', title: 'Later' }
        ]
      }
    };

    // Offline notification queue
    this.offlineQueue = [];
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    if (this.isSupported) {
      this.permission = Notification.permission;
      this.initEventEmitter();
      this.setupConnectionHandlers();
      this.startHealthCheck();
      this.loadOfflineQueue();
    }
  }

  initEventEmitter() {
    if (typeof EventTarget !== 'undefined') {
      this.eventEmitter = new EventTarget();
    } else {
      // Fallback for older browsers
      this.eventEmitter = document.createElement('div');
    }
  }

  // Check if push notifications are supported
  isNotificationSupported() {
    return this.isSupported;
  }

  // Get current permission status
  getPermission() {
    return this.permission;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      this.emitEvent('permissionChanged', { permission });
      
      if (permission === 'granted') {
        await this.setupPushSubscription();
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  // Setup push subscription
  async setupPushSubscription() {
    if (!this.isSupported || this.permission !== 'granted') {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      await this.getVapidKey();
      
      if (!this.vapidPublicKey) {
        console.warn('VAPID public key not available');
        return null;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      this.emitEvent('subscriptionReady', { subscription });
      
      return subscription;
    } catch (error) {
      console.error('Error setting up push subscription:', error);
      throw error;
    }
  }

  // Get VAPID public key from server
  async getVapidKey() {
    try {
      const response = await fetch('/api/notifications/vapid-key');
      if (response.ok) {
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
      }
    } catch (error) {
      console.warn('Could not fetch VAPID key:', error);
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send subscription: ${response.status}`);
      }

      const result = await response.json();
      this.emitEvent('subscriptionSent', { result });
      
      return result;
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  // Show local notification
  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return null;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'default',
      requireInteraction: false,
      silent: false,
      timestamp: Date.now(),
      ...options
    };

    // Use service worker if available, otherwise use Notification API
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }

    this.emitEvent('notificationShown', { title, options: defaultOptions });
  }

  // Send push notification via server
  async sendPushNotification(userId, notification) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icons/icon-192x192.png',
            badge: notification.badge || '/icons/badge-72x72.png',
            tag: notification.tag || 'default',
            data: notification.data || {},
            actions: notification.actions || [],
            requireInteraction: notification.requireInteraction || false,
            silent: notification.silent || false
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send push notification: ${response.status}`);
      }

      const result = await response.json();
      this.emitEvent('pushNotificationSent', { userId, result });
      
      return result;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      
      // Notify server about unsubscription
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        }),
      });

      this.subscription = null;
      this.emitEvent('unsubscribed');
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  // Get current subscription
  async getCurrentSubscription() {
    if (!this.isSupported) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      this.subscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  // Schedule notification (for offline scenarios)
  scheduleNotification(title, options, delay) {
    const scheduleTime = Date.now() + delay;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        title,
        options,
        scheduleTime
      });
    } else {
      setTimeout(() => {
        this.showNotification(title, options);
      }, delay);
    }

    this.emitEvent('notificationScheduled', { title, options, scheduleTime });
  }

  // Clear all notifications
  clearNotifications(tag) {
    if (!this.isSupported) {
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.getNotifications({ tag }).then(notifications => {
          notifications.forEach(notification => notification.close());
        });
      });
    }

    this.emitEvent('notificationsCleared', { tag });
  }

  // Event handling
  on(event, callback) {
    if (this.eventEmitter) {
      this.eventEmitter.addEventListener(event, callback);
    }
  }

  off(event, callback) {
    if (this.eventEmitter) {
      this.eventEmitter.removeEventListener(event, callback);
    }
  }

  emitEvent(eventName, data = {}) {
    if (this.eventEmitter) {
      const event = new CustomEvent(eventName, { detail: data });
      this.eventEmitter.dispatchEvent(event);
    }
  }

  // Utility functions
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if notification should be shown based on user preferences
  shouldShowNotification(type, userPreferences = {}) {
    const defaultPreferences = {
      messages: true,
      jobUpdates: true,
      applications: true,
      system: true,
      marketing: false
    };

    const prefs = { ...defaultPreferences, ...userPreferences };
    return prefs[type] !== false;
  }

  // Get notification templates
  getNotificationTemplate(type, data = {}) {
    const templates = {
      newMessage: {
        title: `New message from ${data.senderName}`,
        body: data.message || 'You have a new message',
        icon: '/icons/message-icon.png',
        tag: 'new-message',
        data: { type: 'message', conversationId: data.conversationId }
      },
      jobApplication: {
        title: 'New Job Application',
        body: `${data.applicantName} applied for ${data.jobTitle}`,
        icon: '/icons/job-icon.png',
        tag: 'job-application',
        data: { type: 'job', jobId: data.jobId }
      },
      applicationUpdate: {
        title: 'Application Status Update',
        body: `Your application for ${data.jobTitle} has been ${data.status}`,
        icon: '/icons/application-icon.png',
        tag: 'application-update',
        data: { type: 'application', applicationId: data.applicationId }
      },
      jobMatch: {
        title: 'New Job Match',
        body: `Found a new job matching your preferences: ${data.jobTitle}`,
        icon: '/icons/match-icon.png',
        tag: 'job-match',
        data: { type: 'job', jobId: data.jobId }
      },
      system: {
        title: data.title || 'System Notification',
        body: data.body || 'System update',
        icon: '/icons/system-icon.png',
        tag: 'system',
        data: { type: 'system' }
      }
    };

    return templates[type] || templates.system;
  }

  // Initialize with user session
  async initialize(userSession = null) {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Check current permission
      this.permission = Notification.permission;

      // Get current subscription if exists
      await this.getCurrentSubscription();

      // If permission is granted but no subscription, set it up
      if (this.permission === 'granted' && !this.subscription) {
        await this.setupPushSubscription();
      }

      this.emitEvent('initialized', { 
        permission: this.permission, 
        subscription: !!this.subscription 
      });

      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  // Setup connection handlers for offline/online detection
  setupConnectionHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emitEvent('connectionRestored');
      this.processOfflineQueue();
      this.resumeHealthCheck();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emitEvent('connectionLost');
      this.pauseHealthCheck();
    });
  }

  // Start health check to monitor subscription status
  startHealthCheck() {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Perform initial health check
    this.performHealthCheck();
  }

  // Pause health check (when offline)
  pauseHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Resume health check (when online)
  resumeHealthCheck() {
    if (!this.healthCheckInterval) {
      this.startHealthCheck();
    }
  }

  // Perform health check
  async performHealthCheck() {
    try {
      this.lastHealthCheck = new Date();

      // Check if service worker is still active
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration || !registration.active) {
          this.emitEvent('serviceWorkerInactive');
          await this.reinitializeServiceWorker();
        }
      }

      // Check if subscription is still valid
      if (this.subscription) {
        try {
          const testResponse = await fetch('/api/notifications/test-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: this.subscription })
          });

          if (!testResponse.ok) {
            // Subscription might be invalid, recreate it
            await this.recreateSubscription();
          }
        } catch (error) {
          console.warn('Health check failed:', error);
        }
      }

      this.emitEvent('healthCheckCompleted', { 
        timestamp: this.lastHealthCheck,
        status: 'healthy'
      });
    } catch (error) {
      console.error('Health check error:', error);
      this.emitEvent('healthCheckFailed', { error });
    }
  }

  // Reinitialize service worker
  async reinitializeServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await registration.update();
      this.emitEvent('serviceWorkerReinitialized');
    } catch (error) {
      console.error('Failed to reinitialize service worker:', error);
    }
  }

  // Recreate push subscription
  async recreateSubscription() {
    try {
      this.subscription = null;
      await this.setupPushSubscription();
      this.emitEvent('subscriptionRecreated');
    } catch (error) {
      console.error('Failed to recreate subscription:', error);
    }
  }

  // Enhanced notification sending with retry logic
  async sendNotificationWithRetry(type, data, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        return await this.sendNotification(type, data, options);
      } catch (error) {
        attempts++;
        
        if (attempts > maxRetries) {
          // Final attempt failed, queue for offline processing
          this.queueOfflineNotification(type, data, options);
          throw new Error(`Notification failed after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Queue notification for offline processing
  queueOfflineNotification(type, data, options = {}) {
    const queueItem = {
      id: Date.now() + Math.random(),
      type,
      data,
      options,
      timestamp: new Date(),
      attempts: 0
    };

    this.offlineQueue.push(queueItem);
    this.saveOfflineQueue();
    
    this.emitEvent('notificationQueued', { item: queueItem });
  }

  // Process offline queue when connection is restored
  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    this.emitEvent('processingOfflineQueue', { count: this.offlineQueue.length });

    const processedItems = [];
    const failedItems = [];

    for (const item of this.offlineQueue) {
      try {
        await this.sendNotification(item.type, item.data, item.options);
        processedItems.push(item);
      } catch (error) {
        item.attempts++;
        
        if (item.attempts < 3) {
          failedItems.push(item);
        } else {
          // Max attempts reached, discard
          console.error(`Discarding notification after max attempts:`, item);
        }
      }
    }

    // Update queue with only failed items that haven't exceeded attempts
    this.offlineQueue = failedItems;
    this.saveOfflineQueue();

    this.emitEvent('offlineQueueProcessed', {
      processed: processedItems.length,
      failed: failedItems.length
    });
  }

  // Save offline queue to localStorage
  saveOfflineQueue() {
    try {
      localStorage.setItem('fixly_notification_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('Failed to save notification queue:', error);
    }
  }

  // Load offline queue from localStorage
  loadOfflineQueue() {
    try {
      const saved = localStorage.getItem('fixly_notification_queue');
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
        
        // Remove old items (older than 24 hours)
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        this.offlineQueue = this.offlineQueue.filter(item => 
          new Date(item.timestamp).getTime() > cutoff
        );
      }
    } catch (error) {
      console.warn('Failed to load notification queue:', error);
      this.offlineQueue = [];
    }
  }

  // Enhanced template system
  getEnhancedTemplate(type, data = {}) {
    const template = this.notificationTemplates[type];
    if (!template) {
      return this.notificationTemplates.system_update;
    }

    // Customize template with data
    return {
      ...template,
      title: this.interpolateString(template.title, data),
      body: this.interpolateString(template.body, data),
      data: { ...template.data, ...data }
    };
  }

  // Interpolate variables in strings
  interpolateString(str, data) {
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  // Show rich notification with enhanced features
  async showRichNotification(type, data = {}, options = {}) {
    try {
      const template = this.getEnhancedTemplate(type, data);
      const notification = new Notification(template.title, {
        ...template,
        ...options,
        timestamp: Date.now()
      });

      // Add click handler
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        this.emitEvent('notificationClicked', {
          type,
          data: template.data,
          action: 'click'
        });

        notification.close();
      };

      // Auto-close after timeout if specified
      if (options.autoClose !== false) {
        const timeout = options.autoCloseDelay || 5000;
        setTimeout(() => notification.close(), timeout);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show rich notification:', error);
      throw error;
    }
  }

  // Get notification statistics
  getStatistics() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      hasSubscription: !!this.subscription,
      isOnline: this.isOnline,
      queueLength: this.offlineQueue.length,
      lastHealthCheck: this.lastHealthCheck,
      retryAttempts: this.retryAttempts
    };
  }

  // Clear all notifications of a specific tag
  clearNotificationsByTag(tag) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.getNotifications({ tag }).then(notifications => {
          notifications.forEach(notification => notification.close());
        });
      });
    }
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.eventEmitter) {
      this.eventEmitter = null;
    }

    // Remove connection handlers
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

// Create singleton instance
let pushNotificationManager = null;

export const getPushNotificationManager = () => {
  if (!pushNotificationManager) {
    pushNotificationManager = new PushNotificationManager();
  }
  return pushNotificationManager;
};

export default PushNotificationManager;