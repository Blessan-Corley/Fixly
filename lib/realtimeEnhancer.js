// Real-time Enhancement Service - Seamless updates across all components
import { EventEmitter } from 'events';
import realtimeManager from './realtime/RealtimeManager';
import silentSync from './silentSync';

class RealtimeEnhancer extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // page/component connections
    this.subscriptions = new Map(); // active subscriptions
    this.updateQueue = new Map(); // queued updates
    this.batchTimeout = null;
    this.batchDelay = 500; // 500ms batching
    this.isOnline = navigator?.onLine ?? true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.initializeRealtimeFeatures();
    this.setupNetworkMonitoring();
  }

  // Initialize real-time features
  initializeRealtimeFeatures() {
    // Enhanced job updates
    this.registerRealtimeFeature('jobs', {
      events: [
        'job:created',
        'job:updated', 
        'job:deleted',
        'job:status_changed',
        'job:application_received',
        'job:payment_completed'
      ],
      handler: (event, data) => this.handleJobUpdate(event, data),
      batchUpdates: true,
      priority: 'high'
    });

    // Real-time comments
    this.registerRealtimeFeature('comments', {
      events: [
        'comment:new',
        'comment:reply',
        'comment:edited',
        'comment:deleted',
        'comment:liked'
      ],
      handler: (event, data) => this.handleCommentUpdate(event, data),
      batchUpdates: false, // Comments should appear immediately
      priority: 'high'
    });

    // User notifications
    this.registerRealtimeFeature('notifications', {
      events: [
        'notification:new',
        'notification:read',
        'notification:deleted'
      ],
      handler: (event, data) => this.handleNotificationUpdate(event, data),
      batchUpdates: true,
      priority: 'medium'
    });

    // User presence and activity
    this.registerRealtimeFeature('presence', {
      events: [
        'user:online',
        'user:offline', 
        'user:typing',
        'user:location_updated'
      ],
      handler: (event, data) => this.handlePresenceUpdate(event, data),
      batchUpdates: true,
      priority: 'low'
    });

    // Payment updates
    this.registerRealtimeFeature('payments', {
      events: [
        'payment:initiated',
        'payment:success',
        'payment:failed',
        'payment:refunded'
      ],
      handler: (event, data) => this.handlePaymentUpdate(event, data),
      batchUpdates: false,
      priority: 'high'
    });

    // System announcements
    this.registerRealtimeFeature('system', {
      events: [
        'system:announcement',
        'system:maintenance',
        'system:update_available'
      ],
      handler: (event, data) => this.handleSystemUpdate(event, data),
      batchUpdates: false,
      priority: 'urgent'
    });
  }

  // Register a real-time feature
  registerRealtimeFeature(key, feature) {
    const featureConfig = {
      batchUpdates: true,
      priority: 'medium',
      handler: () => {},
      events: [],
      ...feature
    };

    this.subscriptions.set(key, featureConfig);

    // Subscribe to events
    featureConfig.events.forEach(event => {
      realtimeManager.on(event, (data) => {
        this.processRealtimeUpdate(key, event, data, featureConfig);
      });
    });
  }

  // Process real-time updates
  processRealtimeUpdate(featureKey, event, data, config) {
    const update = {
      featureKey,
      event,
      data,
      timestamp: Date.now(),
      priority: config.priority
    };

    if (config.batchUpdates && config.priority !== 'urgent') {
      this.queueUpdate(update);
    } else {
      this.applyUpdate(update);
    }
  }

  // Queue update for batching
  queueUpdate(update) {
    const key = `${update.featureKey}:${update.event}`;
    
    if (!this.updateQueue.has(key)) {
      this.updateQueue.set(key, []);
    }
    
    this.updateQueue.get(key).push(update);

    // Clear existing timeout and set new one
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatchedUpdates();
    }, this.batchDelay);
  }

  // Process batched updates
  processBatchedUpdates() {
    if (this.updateQueue.size === 0) return;

    // Group updates by priority
    const priorityGroups = {
      urgent: [],
      high: [],
      medium: [],
      low: []
    };

    for (const [key, updates] of this.updateQueue.entries()) {
      updates.forEach(update => {
        priorityGroups[update.priority].push(update);
      });
    }

    // Process in priority order
    ['urgent', 'high', 'medium', 'low'].forEach(priority => {
      priorityGroups[priority].forEach(update => {
        this.applyUpdate(update);
      });
    });

    // Clear the queue
    this.updateQueue.clear();
    this.batchTimeout = null;
  }

  // Apply update to UI components
  applyUpdate(update) {
    const { featureKey, event, data } = update;
    const config = this.subscriptions.get(featureKey);
    
    if (config && config.handler) {
      try {
        config.handler(event, data);
        this.emit('update:applied', update);
      } catch (error) {
        console.error(`Error applying real-time update:`, error);
        this.emit('update:error', { update, error });
      }
    }

    // Emit to component subscribers
    this.emitToComponents(featureKey, event, data);
  }

  // Handle job updates
  handleJobUpdate(event, data) {
    console.log(`🔄 Job update: ${event}`, data);
    
    switch (event) {
      case 'job:created':
        this.emit('jobs:new', data);
        break;
      
      case 'job:updated':
        this.emit('jobs:updated', data);
        // Trigger silent sync to get latest data
        silentSync.forcSync('jobs');
        break;
      
      case 'job:status_changed':
        this.emit('jobs:status', data);
        this.showStatusNotification(data);
        break;
      
      case 'job:application_received':
        this.emit('jobs:application', data);
        break;

      case 'job:payment_completed':
        this.emit('jobs:payment', data);
        this.showPaymentNotification(data);
        break;
    }
  }

  // Handle comment updates
  handleCommentUpdate(event, data) {
    console.log(`💬 Comment update: ${event}`, data);
    
    switch (event) {
      case 'comment:new':
        this.emit('comments:new', data);
        this.playNotificationSound();
        break;
      
      case 'comment:reply':
        this.emit('comments:reply', data);
        break;
      
      case 'comment:edited':
        this.emit('comments:edited', data);
        break;
      
      case 'comment:deleted':
        this.emit('comments:deleted', data);
        break;
    }
  }

  // Handle notification updates
  handleNotificationUpdate(event, data) {
    console.log(`🔔 Notification update: ${event}`, data);
    
    switch (event) {
      case 'notification:new':
        this.emit('notifications:new', data);
        this.updateNotificationBadge();
        this.playNotificationSound();
        break;
      
      case 'notification:read':
        this.emit('notifications:read', data);
        this.updateNotificationBadge();
        break;
    }
  }

  // Handle presence updates
  handlePresenceUpdate(event, data) {
    switch (event) {
      case 'user:online':
        this.emit('presence:online', data);
        break;
      
      case 'user:offline':
        this.emit('presence:offline', data);
        break;
      
      case 'user:typing':
        this.emit('presence:typing', data);
        break;
      
      case 'user:location_updated':
        this.emit('presence:location', data);
        // Update location display if needed
        this.updateUserLocation(data);
        break;
    }
  }

  // Handle payment updates
  handlePaymentUpdate(event, data) {
    console.log(`💳 Payment update: ${event}`, data);
    
    switch (event) {
      case 'payment:success':
        this.emit('payments:success', data);
        this.showPaymentSuccessNotification(data);
        break;
      
      case 'payment:failed':
        this.emit('payments:failed', data);
        this.showPaymentFailedNotification(data);
        break;
      
      case 'payment:refunded':
        this.emit('payments:refunded', data);
        break;
    }
  }

  // Handle system updates
  handleSystemUpdate(event, data) {
    console.log(`🔧 System update: ${event}`, data);
    
    switch (event) {
      case 'system:announcement':
        this.showSystemAnnouncement(data);
        break;
      
      case 'system:maintenance':
        this.showMaintenanceNotice(data);
        break;
      
      case 'system:update_available':
        this.showUpdateNotification(data);
        break;
    }
  }

  // Component subscription management
  subscribeComponent(componentId, features = []) {
    if (!this.connections.has(componentId)) {
      this.connections.set(componentId, new Set());
    }
    
    const subscriptions = this.connections.get(componentId);
    features.forEach(feature => subscriptions.add(feature));
  }

  unsubscribeComponent(componentId, features = []) {
    if (!this.connections.has(componentId)) return;
    
    const subscriptions = this.connections.get(componentId);
    if (features.length === 0) {
      // Unsubscribe from all
      this.connections.delete(componentId);
    } else {
      features.forEach(feature => subscriptions.delete(feature));
      if (subscriptions.size === 0) {
        this.connections.delete(componentId);
      }
    }
  }

  // Emit to subscribed components
  emitToComponents(featureKey, event, data) {
    for (const [componentId, subscriptions] of this.connections.entries()) {
      if (subscriptions.has(featureKey)) {
        this.emit(`component:${componentId}`, { event, data, featureKey });
      }
    }
  }

  // Network monitoring
  setupNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🟢 Network connection restored');
        this.isOnline = true;
        this.reconnectAttempts = 0;
        this.emit('network:online');
        
        // Trigger sync to catch up on missed updates
        silentSync.forcSync('jobs');
        silentSync.forcSync('notifications');
      });

      window.addEventListener('offline', () => {
        console.log('🔴 Network connection lost');
        this.isOnline = false;
        this.emit('network:offline');
      });
    }
  }

  // UI notification methods
  showStatusNotification(data) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Job ${data.status}`, {
          body: `Your job "${data.jobTitle}" status has been updated`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png'
        });
      }
    }
  }

  showPaymentNotification(data) {
    console.log('💰 Payment notification:', data);
    // Implementation for payment UI notification
  }

  showPaymentSuccessNotification(data) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Payment Successful', {
          body: `Payment of ₹${data.amount} completed successfully`,
          icon: '/icon-192x192.png'
        });
      }
    }
  }

  showPaymentFailedNotification(data) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Payment Failed', {
          body: `Payment of ₹${data.amount} could not be processed`,
          icon: '/icon-192x192.png'
        });
      }
    }
  }

  showSystemAnnouncement(data) {
    console.log('📢 System announcement:', data);
    // Implementation for system announcement UI
  }

  showMaintenanceNotice(data) {
    console.log('🔧 Maintenance notice:', data);
    // Implementation for maintenance notice UI
  }

  showUpdateNotification(data) {
    console.log('🆕 Update available:', data);
    // Implementation for update notification UI
  }

  updateNotificationBadge() {
    // Implementation for notification badge update
    this.emit('badge:update');
  }

  updateUserLocation(data) {
    console.log('📍 User location updated:', data);
    // Implementation for location display update
  }

  playNotificationSound() {
    if (typeof window !== 'undefined' && this.soundEnabled) {
      // Implementation for notification sound
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors
      } catch (error) {
        // Ignore sound errors
      }
    }
  }

  // Configuration
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setBatchDelay(delay) {
    this.batchDelay = delay;
  }

  // Statistics
  getStats() {
    return {
      connections: this.connections.size,
      subscriptions: this.subscriptions.size,
      queuedUpdates: this.updateQueue.size,
      isOnline: this.isOnline,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Cleanup
  destroy() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    this.updateQueue.clear();
    this.connections.clear();
    this.removeAllListeners();
  }
}

// Export singleton instance
const realtimeEnhancer = new RealtimeEnhancer();
export default realtimeEnhancer;