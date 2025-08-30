// Silent Data Synchronization Service - Refresh data without UI disruption
import { EventEmitter } from 'events';

class SilentSync extends EventEmitter {
  constructor() {
    super();
    this.syncQueue = new Map();
    this.syncInProgress = new Set();
    this.lastSyncTimes = new Map();
    this.syncStrategies = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.defaultInterval = 30000; // 30 seconds
    this.isActive = true;
    
    // Initialize default sync strategies
    this.initializeDefaultStrategies();
  }

  // Initialize default synchronization strategies for different data types
  initializeDefaultStrategies() {
    // Jobs data sync
    this.registerSyncStrategy('jobs', {
      endpoint: '/api/jobs',
      method: 'GET',
      interval: 45000, // 45 seconds
      priority: 'high',
      params: { limit: 20, sort: 'newest' },
      diffKey: 'updatedAt',
      transform: (data) => data.jobs,
      onUpdate: (newData, oldData) => {
        this.emit('jobs:updated', { newData, oldData, changes: this.detectChanges(newData, oldData, '_id') });
      }
    });

    // Job comments sync
    this.registerSyncStrategy('job-comments', {
      endpoint: (jobId) => `/api/jobs/${jobId}/comments`,
      method: 'GET',
      interval: 15000, // 15 seconds
      priority: 'high',
      diffKey: 'createdAt',
      transform: (data) => data.comments,
      onUpdate: (newData, oldData, context) => {
        this.emit('comments:updated', { 
          jobId: context.jobId, 
          newData, 
          oldData, 
          changes: this.detectChanges(newData, oldData, '_id') 
        });
      }
    });

    // User notifications sync
    this.registerSyncStrategy('notifications', {
      endpoint: '/api/user/notifications',
      method: 'GET',
      interval: 20000, // 20 seconds
      priority: 'medium',
      params: { limit: 50 },
      diffKey: 'createdAt',
      transform: (data) => data.notifications,
      requiresAuth: true,
      onUpdate: (newData, oldData) => {
        const unreadCount = newData.filter(n => !n.read).length;
        this.emit('notifications:updated', { 
          newData, 
          oldData, 
          unreadCount,
          changes: this.detectChanges(newData, oldData, '_id')
        });
      }
    });

    // Dashboard stats sync
    this.registerSyncStrategy('dashboard-stats', {
      endpoint: '/api/dashboard/stats',
      method: 'GET',
      interval: 60000, // 1 minute
      priority: 'low',
      requiresAuth: true,
      transform: (data) => data.stats,
      onUpdate: (newData, oldData) => {
        this.emit('stats:updated', { newData, oldData });
      }
    });

    // User location tracking
    this.registerSyncStrategy('user-location', {
      endpoint: '/api/location/track',
      method: 'GET',
      interval: 120000, // 2 minutes
      priority: 'low',
      requiresAuth: true,
      onUpdate: (newData, oldData) => {
        this.emit('location:updated', { newData, oldData });
      }
    });

    // Real-time job applications
    this.registerSyncStrategy('job-applications', {
      endpoint: (jobId) => `/api/jobs/${jobId}/applications`,
      method: 'GET',
      interval: 30000, // 30 seconds
      priority: 'high',
      requiresAuth: true,
      transform: (data) => data.applications,
      onUpdate: (newData, oldData, context) => {
        this.emit('applications:updated', { 
          jobId: context.jobId, 
          newData, 
          oldData,
          changes: this.detectChanges(newData, oldData, '_id')
        });
      }
    });
  }

  // Register a new synchronization strategy
  registerSyncStrategy(key, strategy) {
    this.syncStrategies.set(key, {
      interval: this.defaultInterval,
      priority: 'medium',
      retries: 0,
      enabled: true,
      requiresAuth: false,
      method: 'GET',
      params: {},
      headers: {},
      transform: (data) => data,
      onUpdate: () => {},
      onError: (error) => console.error(`Sync error for ${key}:`, error),
      ...strategy
    });
  }

  // Start synchronization for a specific strategy
  startSync(key, context = {}) {
    if (!this.isActive) return;
    
    const strategy = this.syncStrategies.get(key);
    if (!strategy || !strategy.enabled) return;

    const syncId = context.id ? `${key}:${context.id}` : key;
    
    // Prevent duplicate sync operations
    if (this.syncInProgress.has(syncId)) return;

    // Check if we need to wait before next sync
    const lastSync = this.lastSyncTimes.get(syncId);
    if (lastSync && Date.now() - lastSync < strategy.interval) return;

    this.performSync(key, syncId, strategy, context);
  }

  // Perform the actual synchronization
  async performSync(key, syncId, strategy, context = {}) {
    this.syncInProgress.add(syncId);

    try {
      // Build endpoint URL
      let endpoint = typeof strategy.endpoint === 'function' 
        ? strategy.endpoint(context.id) 
        : strategy.endpoint;

      // Add query parameters
      if (strategy.params && Object.keys(strategy.params).length > 0) {
        const params = new URLSearchParams(strategy.params);
        endpoint += `?${params.toString()}`;
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...strategy.headers
      };

      // Add authentication if required
      if (strategy.requiresAuth && this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      // Make the request
      const response = await fetch(endpoint, {
        method: strategy.method,
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (!responseData.success && responseData.success !== undefined) {
        throw new Error(responseData.message || 'API request failed');
      }

      // Transform data if needed
      const newData = strategy.transform(responseData);

      // Get previous data for comparison
      const oldData = this.getCachedData(syncId);

      // Check for changes
      if (this.hasDataChanged(newData, oldData, strategy.diffKey)) {
        // Cache the new data
        this.setCachedData(syncId, newData);

        // Call update handler
        strategy.onUpdate(newData, oldData, context);

        // Emit global sync event
        this.emit('sync:updated', {
          key,
          syncId,
          newData,
          oldData,
          timestamp: new Date()
        });
      }

      // Reset retry count on success
      this.retryAttempts.delete(syncId);
      this.lastSyncTimes.set(syncId, Date.now());

    } catch (error) {
      console.error(`Silent sync error for ${key}:`, error);
      
      // Handle retry logic
      const retries = this.retryAttempts.get(syncId) || 0;
      if (retries < this.maxRetries) {
        this.retryAttempts.set(syncId, retries + 1);
        
        // Exponential backoff: 2^retry * 1000ms
        const delay = Math.pow(2, retries) * 1000;
        setTimeout(() => this.performSync(key, syncId, strategy, context), delay);
      } else {
        // Max retries reached, call error handler
        strategy.onError(error, context);
        this.retryAttempts.delete(syncId);
      }

    } finally {
      this.syncInProgress.delete(syncId);
    }
  }

  // Check if data has changed
  hasDataChanged(newData, oldData, diffKey = 'updatedAt') {
    if (!oldData) return true;
    if (!newData) return false;

    // For arrays, check length and items
    if (Array.isArray(newData) && Array.isArray(oldData)) {
      if (newData.length !== oldData.length) return true;
      
      // Compare by diff key or full object
      for (let i = 0; i < newData.length; i++) {
        const newItem = newData[i];
        const oldItem = oldData[i];
        
        if (diffKey && newItem[diffKey] !== oldItem[diffKey]) return true;
        if (!diffKey && JSON.stringify(newItem) !== JSON.stringify(oldItem)) return true;
      }
      return false;
    }

    // For objects, compare by diff key or full object
    if (typeof newData === 'object') {
      if (diffKey && newData[diffKey] !== oldData[diffKey]) return true;
      return JSON.stringify(newData) !== JSON.stringify(oldData);
    }

    // For primitives
    return newData !== oldData;
  }

  // Detect specific changes between datasets
  detectChanges(newData, oldData, idKey = 'id') {
    if (!Array.isArray(newData) || !Array.isArray(oldData)) {
      return { type: 'replace', newData, oldData };
    }

    const changes = {
      added: [],
      removed: [],
      updated: [],
      unchanged: []
    };

    const oldMap = new Map(oldData.map(item => [item[idKey], item]));
    const newMap = new Map(newData.map(item => [item[idKey], item]));

    // Find added items
    newData.forEach(item => {
      if (!oldMap.has(item[idKey])) {
        changes.added.push(item);
      }
    });

    // Find removed and updated items
    oldData.forEach(item => {
      const newItem = newMap.get(item[idKey]);
      if (!newItem) {
        changes.removed.push(item);
      } else if (JSON.stringify(item) !== JSON.stringify(newItem)) {
        changes.updated.push({ old: item, new: newItem });
      } else {
        changes.unchanged.push(item);
      }
    });

    return changes;
  }

  // Cache management
  getCachedData(syncId) {
    return this.syncQueue.get(syncId);
  }

  setCachedData(syncId, data) {
    this.syncQueue.set(syncId, data);
  }

  // Set authentication token for protected endpoints
  setAuthToken(token) {
    this.authToken = token;
  }

  // Start continuous synchronization for multiple strategies
  startContinuousSync(keys = []) {
    if (!this.isActive) return;

    const strategiesToSync = keys.length > 0 ? keys : Array.from(this.syncStrategies.keys());

    strategiesToSync.forEach(key => {
      const strategy = this.syncStrategies.get(key);
      if (strategy && strategy.enabled) {
        // Start immediate sync
        this.startSync(key);

        // Schedule continuous sync
        setInterval(() => {
          if (this.isActive) {
            this.startSync(key);
          }
        }, strategy.interval);
      }
    });
  }

  // Start sync for specific context (e.g., specific job)
  startContextSync(key, context) {
    this.startSync(key, context);
    
    const strategy = this.syncStrategies.get(key);
    if (strategy && strategy.enabled) {
      const interval = setInterval(() => {
        if (this.isActive) {
          this.startSync(key, context);
        }
      }, strategy.interval);

      // Store interval for cleanup
      const syncId = context.id ? `${key}:${context.id}` : key;
      if (!this.intervals) this.intervals = new Map();
      this.intervals.set(syncId, interval);
    }
  }

  // Stop sync for specific context
  stopContextSync(key, context) {
    const syncId = context.id ? `${key}:${context.id}` : key;
    if (this.intervals && this.intervals.has(syncId)) {
      clearInterval(this.intervals.get(syncId));
      this.intervals.delete(syncId);
    }
  }

  // Enable/disable strategy
  toggleStrategy(key, enabled = true) {
    const strategy = this.syncStrategies.get(key);
    if (strategy) {
      strategy.enabled = enabled;
    }
  }

  // Update strategy parameters
  updateStrategy(key, updates) {
    const strategy = this.syncStrategies.get(key);
    if (strategy) {
      Object.assign(strategy, updates);
    }
  }

  // Pause all synchronization
  pause() {
    this.isActive = false;
  }

  // Resume synchronization
  resume() {
    this.isActive = true;
  }

  // Get sync statistics
  getStats() {
    return {
      strategies: this.syncStrategies.size,
      activeSync: this.syncInProgress.size,
      cached: this.syncQueue.size,
      isActive: this.isActive,
      lastSyncTimes: Object.fromEntries(this.lastSyncTimes),
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }

  // Manual sync trigger
  async forcSync(key, context = {}) {
    const strategy = this.syncStrategies.get(key);
    if (!strategy) {
      throw new Error(`Sync strategy '${key}' not found`);
    }

    const syncId = context.id ? `${key}:${context.id}` : key;
    return this.performSync(key, syncId, strategy, context);
  }

  // Clear all cached data
  clearCache() {
    this.syncQueue.clear();
    this.lastSyncTimes.clear();
    this.retryAttempts.clear();
  }

  // Cleanup resources
  destroy() {
    this.pause();
    this.clearCache();
    if (this.intervals) {
      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals.clear();
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
const silentSync = new SilentSync();
export default silentSync;