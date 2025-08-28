// Background Data Synchronization Manager - No UI Disruption
import { EventEmitter } from 'events';

class BackgroundSyncManager extends EventEmitter {
  constructor() {
    super();
    this.syncQueues = new Map(); // userId -> sync queue
    this.syncStates = new Map(); // userId -> last sync states
    this.syncIntervals = new Map(); // userId -> interval IDs
    this.pendingSync = new Map(); // userId -> pending sync operations
    this.backgroundUpdateBuffer = new Map(); // userId -> buffered updates
    
    // Configuration
    this.config = {
      syncInterval: 30000, // 30 seconds base sync
      priorityDataInterval: 5000, // 5 seconds for priority data
      batchSize: 50, // Number of items to sync per batch
      retryAttempts: 3,
      retryDelay: 2000, // 2 seconds between retries
      maxBufferSize: 1000, // Maximum buffered updates per user
      syncCategories: [
        'messages',
        'notifications', 
        'jobs',
        'applications',
        'presence',
        'location',
        'comments',
        'user_data',
        'activity'
      ]
    };
    
    // Start global sync coordinator
    this.startGlobalCoordinator();
    
    console.log('🔄 Background Sync Manager initialized');
  }

  // Register user for background sync
  registerUser(userId, preferences = {}) {
    if (this.syncQueues.has(userId)) {
      return; // Already registered
    }

    const userPrefs = {
      syncEnabled: true,
      priorityCategories: ['messages', 'notifications'],
      backgroundSync: true,
      ...preferences
    };

    // Initialize user sync state
    this.syncQueues.set(userId, {
      pending: [],
      processing: false,
      lastSync: Date.now(),
      preferences: userPrefs,
      errors: [],
      stats: {
        totalSyncs: 0,
        lastSyncDuration: 0,
        avgSyncDuration: 0,
        failedSyncs: 0
      }
    });

    this.syncStates.set(userId, new Map());
    this.backgroundUpdateBuffer.set(userId, new Map());

    // Start user-specific sync
    this.startUserSync(userId);
    
    console.log(`✅ Registered user ${userId} for background sync`);
  }

  // Unregister user from sync
  unregisterUser(userId) {
    // Clear intervals
    if (this.syncIntervals.has(userId)) {
      clearInterval(this.syncIntervals.get(userId));
      this.syncIntervals.delete(userId);
    }

    // Clean up data
    this.syncQueues.delete(userId);
    this.syncStates.delete(userId);
    this.backgroundUpdateBuffer.delete(userId);
    this.pendingSync.delete(userId);

    console.log(`🗑️ Unregistered user ${userId} from background sync`);
  }

  // Queue data for sync (called by API endpoints)
  queueSync(userId, category, operation, data, priority = 'normal') {
    const queue = this.syncQueues.get(userId);
    if (!queue || !queue.preferences.syncEnabled) {
      return false;
    }

    const syncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      operation, // 'create', 'update', 'delete', 'fetch'
      data,
      priority, // 'high', 'normal', 'low'
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.config.retryAttempts
    };

    // Add to appropriate queue based on priority
    if (priority === 'high' || queue.preferences.priorityCategories.includes(category)) {
      queue.pending.unshift(syncItem); // Add to front for immediate processing
    } else {
      queue.pending.push(syncItem);
    }

    // Trigger immediate sync for high priority items
    if (priority === 'high') {
      this.processSyncQueue(userId, true);
    }

    return syncItem.id;
  }

  // Buffer updates for batch processing (prevents UI spam)
  bufferUpdate(userId, category, updateType, data) {
    if (!this.backgroundUpdateBuffer.has(userId)) {
      return;
    }

    const buffer = this.backgroundUpdateBuffer.get(userId);
    const bufferKey = `${category}_${updateType}`;
    
    if (!buffer.has(bufferKey)) {
      buffer.set(bufferKey, []);
    }
    
    const categoryBuffer = buffer.get(bufferKey);
    categoryBuffer.push({
      data,
      timestamp: Date.now()
    });

    // Prevent buffer overflow
    if (categoryBuffer.length > this.config.maxBufferSize) {
      categoryBuffer.shift(); // Remove oldest
    }

    // Auto-flush buffer after timeout
    setTimeout(() => {
      this.flushBuffer(userId, bufferKey);
    }, 2000); // 2 second buffer window
  }

  // Start user-specific sync loop
  startUserSync(userId) {
    if (this.syncIntervals.has(userId)) {
      return; // Already started
    }

    // Regular sync interval
    const intervalId = setInterval(() => {
      this.processSyncQueue(userId);
    }, this.config.syncInterval);

    // Priority data sync interval
    const priorityIntervalId = setInterval(() => {
      this.syncPriorityData(userId);
    }, this.config.priorityDataInterval);

    this.syncIntervals.set(userId, {
      regular: intervalId,
      priority: priorityIntervalId
    });
  }

  // Process user's sync queue
  async processSyncQueue(userId, immediate = false) {
    const queue = this.syncQueues.get(userId);
    if (!queue || queue.processing) {
      return; // Queue is being processed or doesn't exist
    }

    if (queue.pending.length === 0) {
      return; // Nothing to sync
    }

    queue.processing = true;
    const startTime = Date.now();

    try {
      // Process items in batches
      const batchSize = immediate ? 1 : this.config.batchSize;
      const batch = queue.pending.splice(0, batchSize);
      
      const results = await Promise.allSettled(
        batch.map(item => this.processSyncItem(userId, item))
      );

      // Handle results
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        const item = batch[index];
        
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
          this.updateSyncState(userId, item.category, result.value.data);
        } else {
          failureCount++;
          item.attempts++;
          
          // Retry failed items
          if (item.attempts < item.maxAttempts) {
            queue.pending.push(item);
            console.log(`🔄 Retrying sync item ${item.id} (attempt ${item.attempts}/${item.maxAttempts})`);
          } else {
            queue.errors.push({
              item,
              error: result.reason || 'Max attempts exceeded',
              timestamp: Date.now()
            });
            console.error(`❌ Sync item ${item.id} failed permanently`);
          }
        }
      });

      // Update stats
      const duration = Date.now() - startTime;
      queue.stats.totalSyncs++;
      queue.stats.lastSyncDuration = duration;
      queue.stats.avgSyncDuration = 
        (queue.stats.avgSyncDuration * (queue.stats.totalSyncs - 1) + duration) / queue.stats.totalSyncs;
      queue.stats.failedSyncs += failureCount;
      queue.lastSync = Date.now();

      // Emit sync completed event (for internal use)
      this.emit('sync:completed', {
        userId,
        successCount,
        failureCount,
        duration,
        remainingItems: queue.pending.length
      });

      console.log(`📊 User ${userId} sync: ${successCount} success, ${failureCount} failed, ${duration}ms`);

    } catch (error) {
      console.error(`❌ Sync queue processing error for user ${userId}:`, error);
      queue.stats.failedSyncs++;
    } finally {
      queue.processing = false;
    }
  }

  // Process individual sync item
  async processSyncItem(userId, item) {
    try {
      switch (item.category) {
        case 'messages':
          return await this.syncMessages(userId, item);
        case 'notifications':
          return await this.syncNotifications(userId, item);
        case 'jobs':
          return await this.syncJobs(userId, item);
        case 'applications':
          return await this.syncApplications(userId, item);
        case 'presence':
          return await this.syncPresence(userId, item);
        case 'location':
          return await this.syncLocation(userId, item);
        case 'comments':
          return await this.syncComments(userId, item);
        case 'user_data':
          return await this.syncUserData(userId, item);
        case 'activity':
          return await this.syncActivity(userId, item);
        default:
          throw new Error(`Unknown sync category: ${item.category}`);
      }
    } catch (error) {
      console.error(`❌ Sync item processing error:`, error);
      return { success: false, error: error.message };
    }
  }

  // Sync priority data (messages, notifications)
  async syncPriorityData(userId) {
    const queue = this.syncQueues.get(userId);
    if (!queue || queue.processing) {
      return;
    }

    // Check for new priority data
    try {
      await Promise.all([
        this.checkNewMessages(userId),
        this.checkNewNotifications(userId),
        this.checkPresenceUpdates(userId)
      ]);
    } catch (error) {
      console.error(`❌ Priority data sync error for user ${userId}:`, error);
    }
  }

  // Individual sync methods
  async syncMessages(userId, item) {
    const { default: connectDB } = await import('../mongodb');
    await connectDB();

    switch (item.operation) {
      case 'fetch':
        return await this.fetchMessages(userId, item.data);
      case 'update_status':
        return await this.updateMessageStatus(userId, item.data);
      case 'mark_read':
        return await this.markMessagesRead(userId, item.data);
      default:
        throw new Error(`Unknown message operation: ${item.operation}`);
    }
  }

  async syncNotifications(userId, item) {
    const { default: connectDB } = await import('../mongodb');
    const { default: User } = await import('../../models/User');
    await connectDB();

    switch (item.operation) {
      case 'fetch':
        const user = await User.findById(userId).select('notifications');
        const notifications = user?.notifications?.filter(n => 
          !item.data.lastFetch || new Date(n.createdAt) > new Date(item.data.lastFetch)
        ) || [];
        
        return {
          success: true,
          data: {
            notifications,
            count: notifications.length,
            unreadCount: notifications.filter(n => !n.read).length
          }
        };
      case 'mark_read':
        await User.findByIdAndUpdate(userId, {
          $set: { 'notifications.$[elem].read': true }
        }, {
          arrayFilters: [{ 'elem._id': { $in: item.data.notificationIds } }]
        });
        return { success: true, data: { markedCount: item.data.notificationIds.length } };
      default:
        throw new Error(`Unknown notification operation: ${item.operation}`);
    }
  }

  async syncJobs(userId, item) {
    const { default: connectDB } = await import('../mongodb');
    const { default: Job } = await import('../../models/Job');
    await connectDB();

    switch (item.operation) {
      case 'fetch_nearby':
        return await this.fetchNearbyJobs(userId, item.data);
      case 'update_views':
        return await this.updateJobViews(userId, item.data);
      case 'fetch_applications':
        return await this.fetchJobApplications(userId, item.data);
      default:
        throw new Error(`Unknown job operation: ${item.operation}`);
    }
  }

  // Helper methods for sync operations
  async checkNewMessages(userId) {
    const lastCheck = this.getSyncState(userId, 'messages_last_check') || 0;
    const now = Date.now();
    
    // Queue fetch for new messages
    this.queueSync(userId, 'messages', 'fetch', {
      since: lastCheck,
      limit: 50
    }, 'high');
    
    this.updateSyncState(userId, 'messages_last_check', now);
  }

  async checkNewNotifications(userId) {
    const lastCheck = this.getSyncState(userId, 'notifications_last_check') || 0;
    const now = Date.now();
    
    this.queueSync(userId, 'notifications', 'fetch', {
      since: lastCheck
    }, 'high');
    
    this.updateSyncState(userId, 'notifications_last_check', now);
  }

  async checkPresenceUpdates(userId) {
    // Update user's own presence
    this.queueSync(userId, 'presence', 'update', {
      lastActivity: Date.now(),
      status: 'online'
    }, 'normal');
  }

  // Flush buffered updates
  flushBuffer(userId, bufferKey) {
    const buffer = this.backgroundUpdateBuffer.get(userId);
    if (!buffer || !buffer.has(bufferKey)) {
      return;
    }

    const updates = buffer.get(bufferKey);
    if (updates.length === 0) {
      return;
    }

    // Extract category and type from buffer key
    const [category, updateType] = bufferKey.split('_');
    
    // Queue batch update
    this.queueSync(userId, category, `batch_${updateType}`, {
      updates,
      count: updates.length,
      timespan: updates[updates.length - 1].timestamp - updates[0].timestamp
    }, 'normal');

    // Clear buffer
    buffer.set(bufferKey, []);
    
    console.log(`📦 Flushed ${updates.length} ${bufferKey} updates for user ${userId}`);
  }

  // Get/Set sync state
  getSyncState(userId, key) {
    const states = this.syncStates.get(userId);
    return states?.get(key) || null;
  }

  updateSyncState(userId, key, value) {
    if (!this.syncStates.has(userId)) {
      this.syncStates.set(userId, new Map());
    }
    this.syncStates.get(userId).set(key, value);
  }

  // Global sync coordinator
  startGlobalCoordinator() {
    // Cleanup old sync states every 10 minutes
    setInterval(() => {
      this.cleanupSyncStates();
    }, 10 * 60 * 1000);

    // Health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);

    console.log('🌐 Global sync coordinator started');
  }

  cleanupSyncStates() {
    let cleanedUsers = 0;
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, queue] of this.syncQueues.entries()) {
      if (now - queue.lastSync > maxAge) {
        this.unregisterUser(userId);
        cleanedUsers++;
      } else {
        // Clean old errors
        queue.errors = queue.errors.filter(error => 
          now - error.timestamp < 60 * 60 * 1000 // Keep errors for 1 hour
        );
      }
    }

    if (cleanedUsers > 0) {
      console.log(`🧹 Cleaned up sync state for ${cleanedUsers} inactive users`);
    }
  }

  performHealthCheck() {
    const stats = this.getGlobalStats();
    
    // Log health status
    console.log(`💊 Sync Health Check:`, {
      activeUsers: stats.activeUsers,
      totalSyncs: stats.totalSyncs,
      avgSyncTime: `${stats.avgSyncTime}ms`,
      errorRate: `${stats.errorRate}%`
    });

    // Emit health check event
    this.emit('health:check', stats);
  }

  // Get comprehensive stats
  getGlobalStats() {
    let totalSyncs = 0;
    let totalErrors = 0;
    let totalSyncTime = 0;
    let activeUsers = 0;

    for (const [userId, queue] of this.syncQueues.entries()) {
      activeUsers++;
      totalSyncs += queue.stats.totalSyncs;
      totalErrors += queue.stats.failedSyncs;
      totalSyncTime += queue.stats.avgSyncDuration;
    }

    return {
      activeUsers,
      totalSyncs,
      totalErrors,
      avgSyncTime: activeUsers > 0 ? Math.round(totalSyncTime / activeUsers) : 0,
      errorRate: totalSyncs > 0 ? Math.round((totalErrors / totalSyncs) * 100) : 0,
      timestamp: Date.now()
    };
  }

  // Get user-specific stats
  getUserStats(userId) {
    const queue = this.syncQueues.get(userId);
    if (!queue) {
      return null;
    }

    return {
      ...queue.stats,
      pendingItems: queue.pending.length,
      lastSync: queue.lastSync,
      processing: queue.processing,
      errorCount: queue.errors.length,
      preferences: queue.preferences
    };
  }

  // Update sync preferences
  updateUserPreferences(userId, preferences) {
    const queue = this.syncQueues.get(userId);
    if (!queue) {
      return false;
    }

    queue.preferences = {
      ...queue.preferences,
      ...preferences
    };

    console.log(`⚙️ Updated sync preferences for user ${userId}`);
    return true;
  }
}

// Singleton instance
const backgroundSyncManager = new BackgroundSyncManager();

export default backgroundSyncManager;