/**
 * Web Push Notification Service
 * Handles browser notifications with Ably integration
 */

export class WebPushService {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.subscription = null;
  }

  // Check if push notifications are supported
  isNotificationSupported() {
    return this.isSupported;
  }

  // Get current permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        await this.initializeServiceWorker();
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  // Initialize service worker for push notifications
  async initializeServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      throw error;
    }
  }

  // Show notification (fallback for when user is on the page)
  showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'fixly-notification',
      renotify: true,
      requireInteraction: false,
      actions: [],
      data: {}
    };

    const notificationOptions = { ...defaultOptions, ...options };

    // Show notification
    const notification = new Notification(title, notificationOptions);

    // Handle click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();

      // Handle action based on notification data
      if (notificationOptions.data?.action) {
        this.handleNotificationAction(notificationOptions.data);
      }

      notification.close();
    };

    // Auto-close after 5 seconds if not requiring interaction
    if (!notificationOptions.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    return notification;
  }

  // Handle notification actions
  handleNotificationAction(data) {
    const { action, actionData } = data;

    switch (action) {
      case 'view_job':
        window.location.href = `/jobs/${actionData.jobId}`;
        break;

      case 'view_applications':
        window.location.href = `/dashboard/jobs/${actionData.jobId}`;
        break;

      case 'open_chat':
        window.location.href = `/dashboard/jobs/${actionData.jobId}/messages`;
        break;

      case 'view_comment':
        window.location.href = `/jobs/${actionData.jobId}#comment-${actionData.commentId}`;
        break;

      case 'view_dashboard':
        window.location.href = '/dashboard';
        break;

      default:
        window.location.href = '/dashboard';
        break;
    }
  }

  // Create notification based on Ably message
  createNotificationFromAbly(message) {
    const { type, title, message: content, actionData, priority } = message.data;

    const notificationConfig = {
      body: content,
      data: { action: actionData?.action, actionData },
      requireInteraction: priority === 'critical',
      actions: this.getNotificationActions(type, actionData)
    };

    // Set icon based on notification type
    switch (type) {
      case 'job_application':
        notificationConfig.icon = '/icons/application-icon.png';
        break;
      case 'application_accepted':
        notificationConfig.icon = '/icons/success-icon.png';
        break;
      case 'private_message':
        notificationConfig.icon = '/icons/message-icon.png';
        break;
      case 'job_comment':
        notificationConfig.icon = '/icons/comment-icon.png';
        break;
      default:
        notificationConfig.icon = '/icons/icon-192x192.png';
        break;
    }

    return this.showNotification(title, notificationConfig);
  }

  // Get notification actions based on type
  getNotificationActions(type, actionData) {
    switch (type) {
      case 'job_application':
        return [
          {
            action: 'view',
            title: 'View Application',
            icon: '/icons/view-icon.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/dismiss-icon.png'
          }
        ];

      case 'private_message':
        return [
          {
            action: 'reply',
            title: 'Reply',
            icon: '/icons/reply-icon.png'
          },
          {
            action: 'view',
            title: 'View Chat',
            icon: '/icons/chat-icon.png'
          }
        ];

      case 'job_comment':
        return [
          {
            action: 'view',
            title: 'View Comment',
            icon: '/icons/comment-icon.png'
          }
        ];

      default:
        return [];
    }
  }

  // Save subscription to server
  async saveSubscription(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      this.subscription = subscription;
      console.log('✅ Push subscription saved');
    } catch (error) {
      console.error('❌ Failed to save subscription:', error);
      throw error;
    }
  }

  // Remove subscription from server
  async removeSubscription() {
    if (!this.subscription) return;

    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: this.subscription
        })
      });

      this.subscription = null;
      console.log('✅ Push subscription removed');
    } catch (error) {
      console.error('❌ Failed to remove subscription:', error);
    }
  }

  // Test notification
  testNotification() {
    this.showNotification('Test Notification', {
      body: 'This is a test notification from Fixly!',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification',
      data: {
        action: 'view_dashboard'
      }
    });
  }
}

// Notification Hook for React components
export function useWebPushNotifications() {
  const [pushService] = useState(() => new WebPushService());
  const [permission, setPermission] = useState(pushService.getPermissionStatus());
  const [isSupported] = useState(pushService.isNotificationSupported());

  const requestPermission = async () => {
    try {
      const granted = await pushService.requestPermission();
      setPermission(pushService.getPermissionStatus());
      return granted;
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  };

  const showNotification = (title, options) => {
    return pushService.showNotification(title, options);
  };

  const testNotification = () => {
    pushService.testNotification();
  };

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    testNotification,
    isEnabled: permission === 'granted'
  };
}

// Export singleton instance
export const webPushService = new WebPushService();

// Auto-initialize if permission already granted
if (typeof window !== 'undefined' && webPushService.getPermissionStatus() === 'granted') {
  webPushService.initializeServiceWorker().catch(console.error);
}