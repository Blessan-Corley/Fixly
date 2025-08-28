// Seamless Auto-Refresh Manager - Zero User Disruption
import { EventEmitter } from 'events';

class SeamlessRefreshManager extends EventEmitter {
  constructor() {
    super();
    this.refreshStates = new Map(); // userId -> refresh states
    this.refreshIntervals = new Map(); // userId -> interval configurations
    this.lastDataStates = new Map(); // userId -> last known data states
    this.pendingUpdates = new Map(); // userId -> queued updates
    this.refreshStrategies = new Map(); // component -> refresh strategy
    this.userActivity = new Map(); // userId -> activity tracking
    
    // Configuration for different data types
    this.refreshConfig = {
      // High frequency updates (when user is active)
      realtime: {
        interval: 1000, // 1 second
        categories: ['typing_indicators', 'presence', 'live_counters'],
        activeOnly: true
      },
      // Medium frequency updates
      frequent: {
        interval: 5000, // 5 seconds  
        categories: ['messages', 'notifications', 'job_applications'],
        backgroundDelay: 30000 // 30 seconds when inactive
      },
      // Low frequency updates
      periodic: {
        interval: 30000, // 30 seconds
        categories: ['jobs', 'user_profiles', 'reviews'],
        backgroundDelay: 300000 // 5 minutes when inactive
      },
      // Very low frequency updates
      occasional: {
        interval: 300000, // 5 minutes
        categories: ['settings', 'analytics', 'system_status'],
        backgroundDelay: 1800000 // 30 minutes when inactive
      }
    };

    this.startGlobalManager();
    console.log('🔄 Seamless Refresh Manager initialized');
  }

  // Register user for seamless refresh
  registerUser(userId, preferences = {}) {
    if (this.refreshStates.has(userId)) {
      return; // Already registered
    }

    const userPrefs = {
      autoRefresh: true,
      smartRefresh: true, // Adapt refresh rates based on user activity
      backgroundRefresh: true,
      dataCompression: true,
      deltaUpdates: true, // Only send changes
      ...preferences
    };

    // Initialize user state
    this.refreshStates.set(userId, {
      active: true,
      lastActivity: Date.now(),
      currentPage: null,
      visibilityState: 'visible',
      connectionQuality: 'good',
      preferences: userPrefs,
      refreshCounters: new Map(),
      dataVersions: new Map(), // Track data versions for delta updates
      lastRefresh: new Map(), // Track last refresh per category
      refreshErrors: []
    });

    this.lastDataStates.set(userId, new Map());
    this.pendingUpdates.set(userId, new Map());
    this.userActivity.set(userId, {
      interactions: 0,
      scrolls: 0,
      clicks: 0,
      lastInteraction: Date.now(),
      pageViews: []
    });

    this.startUserRefresh(userId);
    console.log(`✅ Registered user ${userId} for seamless refresh`);
  }

  // Unregister user
  unregisterUser(userId) {
    if (this.refreshIntervals.has(userId)) {
      const intervals = this.refreshIntervals.get(userId);
      Object.values(intervals).forEach(interval => {
        if (interval.id) clearInterval(interval.id);
      });
      this.refreshIntervals.delete(userId);
    }

    this.refreshStates.delete(userId);
    this.lastDataStates.delete(userId);
    this.pendingUpdates.delete(userId);
    this.userActivity.delete(userId);

    console.log(`🗑️ Unregistered user ${userId} from seamless refresh`);
  }

  // Update user activity (affects refresh frequency)
  updateUserActivity(userId, activityType, metadata = {}) {
    const state = this.refreshStates.get(userId);
    const activity = this.userActivity.get(userId);
    
    if (!state || !activity) return;

    state.lastActivity = Date.now();
    activity.lastInteraction = Date.now();

    // Track specific activity types
    switch (activityType) {
      case 'page_view':
        state.currentPage = metadata.page;
        activity.pageViews.push({
          page: metadata.page,
          timestamp: Date.now()
        });
        break;
      case 'interaction':
        activity.interactions++;
        break;
      case 'scroll':
        activity.scrolls++;
        break;
      case 'click':
        activity.clicks++;
        break;
      case 'visibility_change':
        state.visibilityState = metadata.visible ? 'visible' : 'hidden';
        this.adjustRefreshRates(userId);
        break;
      case 'focus_change':
        state.active = metadata.focused;
        this.adjustRefreshRates(userId);
        break;
      case 'network_change':
        state.connectionQuality = metadata.quality || 'good';
        this.adjustRefreshRates(userId);
        break;
    }

    // Trigger immediate refresh for certain activities
    if (['page_view', 'interaction'].includes(activityType)) {
      this.triggerImmediateRefresh(userId, ['frequent']);
    }
  }

  // Start user refresh intervals
  startUserRefresh(userId) {
    if (this.refreshIntervals.has(userId)) {
      return; // Already started
    }

    const intervals = {};

    // Set up intervals for each refresh type
    Object.entries(this.refreshConfig).forEach(([type, config]) => {
      intervals[type] = {
        id: setInterval(() => {
          this.performRefresh(userId, type);
        }, config.interval),
        config
      };
    });

    this.refreshIntervals.set(userId, intervals);
    console.log(`🟢 Started refresh intervals for user ${userId}`);
  }

  // Perform refresh for specific type
  async performRefresh(userId, refreshType) {
    const state = this.refreshStates.get(userId);
    if (!state || !state.preferences.autoRefresh) {
      return;
    }

    const config = this.refreshConfig[refreshType];
    if (!config) return;

    // Skip if user is inactive and this is active-only refresh
    if (config.activeOnly && !this.isUserActive(userId)) {
      return;
    }

    // Use background delay if user is inactive
    if (!this.isUserActive(userId) && config.backgroundDelay) {
      const lastRefresh = state.lastRefresh.get(refreshType) || 0;
      if (Date.now() - lastRefresh < config.backgroundDelay) {
        return; // Too soon for background refresh
      }
    }

    try {
      // Process each category in this refresh type
      const refreshPromises = config.categories.map(category => 
        this.refreshDataCategory(userId, category, refreshType)
      );

      await Promise.allSettled(refreshPromises);
      state.lastRefresh.set(refreshType, Date.now());
      
    } catch (error) {
      console.error(`❌ Refresh error for user ${userId}, type ${refreshType}:`, error);
      state.refreshErrors.push({
        type: refreshType,
        error: error.message,
        timestamp: Date.now()
      });

      // Limit error log size
      if (state.refreshErrors.length > 10) {
        state.refreshErrors.shift();
      }
    }
  }

  // Refresh specific data category
  async refreshDataCategory(userId, category, refreshType) {
    const state = this.refreshStates.get(userId);
    const currentVersion = state.dataVersions.get(category) || 0;
    
    try {
      // Get fresh data with version
      const refreshResult = await this.fetchCategoryData(userId, category, currentVersion);
      
      if (!refreshResult || !refreshResult.success) {
        return;
      }

      const { data, version, hasChanges } = refreshResult;
      
      // Only process if there are actual changes
      if (!hasChanges) {
        return;
      }

      // Update version tracking
      state.dataVersions.set(category, version);
      
      // Store last known state for delta comparison
      const lastState = this.lastDataStates.get(userId);
      const previousData = lastState.get(category);
      
      // Calculate delta if enabled
      let updateData = data;
      if (state.preferences.deltaUpdates && previousData) {
        updateData = this.calculateDelta(previousData, data, category);
      }

      // Store new state
      lastState.set(category, data);
      
      // Queue update for seamless application
      this.queueSeamlessUpdate(userId, category, updateData, refreshType);
      
      // Update refresh counter
      const counter = state.refreshCounters.get(category) || 0;
      state.refreshCounters.set(category, counter + 1);
      
      console.log(`🔄 Refreshed ${category} for user ${userId} (v${version})`);
      
    } catch (error) {
      console.error(`❌ Category refresh error (${category}):`, error);
      throw error;
    }
  }

  // Fetch data for specific category
  async fetchCategoryData(userId, category, currentVersion = 0) {
    const state = this.refreshStates.get(userId);
    
    // Build fetch parameters
    const params = new URLSearchParams({
      version: currentVersion.toString(),
      compressed: state.preferences.dataCompression ? 'true' : 'false',
      delta: state.preferences.deltaUpdates ? 'true' : 'false'
    });

    // Add context-specific parameters
    if (state.currentPage) {
      params.append('page', state.currentPage);
    }

    try {
      let apiUrl;
      
      // Map categories to API endpoints
      switch (category) {
        case 'messages':
          apiUrl = '/api/messages/refresh';
          break;
        case 'notifications':
          apiUrl = '/api/user/notifications';
          break;
        case 'job_applications':
          apiUrl = '/api/jobs/applications/refresh';
          break;
        case 'jobs':
          apiUrl = '/api/jobs/refresh';
          break;
        case 'presence':
          apiUrl = '/api/user/presence?action=refresh';
          break;
        case 'typing_indicators':
          apiUrl = '/api/realtime/typing/status';
          break;
        case 'live_counters':
          apiUrl = '/api/realtime/counters';
          break;
        case 'user_profiles':
          apiUrl = '/api/user/profile/refresh';
          break;
        case 'reviews':
          apiUrl = '/api/reviews/refresh';
          break;
        default:
          console.warn(`Unknown refresh category: ${category}`);
          return null;
      }

      const response = await fetch(`${apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'X-Refresh-Type': 'seamless',
          'X-User-Activity': this.isUserActive(userId) ? 'active' : 'inactive'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result.data || result,
        version: result.version || currentVersion + 1,
        hasChanges: result.hasChanges !== false, // Default to true unless explicitly false
        metadata: result.metadata || {}
      };

    } catch (error) {
      console.error(`❌ Fetch error for category ${category}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Queue seamless update (no UI disruption)
  queueSeamlessUpdate(userId, category, data, refreshType) {
    const pending = this.pendingUpdates.get(userId);
    if (!pending) return;

    const updateKey = `${category}_${refreshType}`;
    
    // Store the update
    pending.set(updateKey, {
      category,
      data,
      refreshType,
      timestamp: Date.now(),
      applied: false
    });

    // Apply updates based on strategy
    setTimeout(() => {
      this.applySeamlessUpdate(userId, updateKey);
    }, this.getUpdateDelay(userId, category, refreshType));
  }

  // Apply seamless update to UI (via events)
  applySeamlessUpdate(userId, updateKey) {
    const pending = this.pendingUpdates.get(userId);
    if (!pending || !pending.has(updateKey)) return;

    const update = pending.get(updateKey);
    if (update.applied) return;

    // Mark as applied
    update.applied = true;
    
    // Emit update event for UI components to catch
    this.emit('seamless:update', {
      userId,
      category: update.category,
      data: update.data,
      refreshType: update.refreshType,
      timestamp: update.timestamp,
      strategy: 'seamless' // Tells UI to apply without disruption
    });

    // Clean up applied updates after delay
    setTimeout(() => {
      pending.delete(updateKey);
    }, 60000); // Keep for 1 minute for debugging

    console.log(`✨ Applied seamless update: ${update.category} for user ${userId}`);
  }

  // Calculate delta between old and new data
  calculateDelta(oldData, newData, category) {
    try {
      // Simple delta calculation - in production, use more sophisticated diff
      const changes = {};
      
      if (Array.isArray(newData)) {
        // For arrays, find new/updated items
        const oldIds = new Set(oldData.map(item => item.id || item._id));
        changes.added = newData.filter(item => 
          !oldIds.has(item.id || item._id)
        );
        changes.updated = []; // Would need more complex comparison
        changes.total = newData.length;
      } else if (typeof newData === 'object') {
        // For objects, find changed properties
        Object.keys(newData).forEach(key => {
          if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            changes[key] = newData[key];
          }
        });
      }

      return Object.keys(changes).length > 0 ? changes : newData;
      
    } catch (error) {
      console.error('Delta calculation error:', error);
      return newData; // Fallback to full data
    }
  }

  // Determine update delay based on user activity and priority
  getUpdateDelay(userId, category, refreshType) {
    const state = this.refreshStates.get(userId);
    if (!state) return 0;

    // No delay for high priority updates
    if (refreshType === 'realtime') return 0;
    
    // Longer delay if user is inactive
    if (!this.isUserActive(userId)) {
      return 2000; // 2 seconds
    }

    // Shorter delay for frequent updates
    if (refreshType === 'frequent') {
      return 500; // 0.5 seconds
    }

    return 1000; // 1 second default
  }

  // Check if user is currently active
  isUserActive(userId) {
    const state = this.refreshStates.get(userId);
    if (!state) return false;

    const now = Date.now();
    const inactiveThreshold = 2 * 60 * 1000; // 2 minutes

    return (
      state.active &&
      state.visibilityState === 'visible' &&
      (now - state.lastActivity) < inactiveThreshold
    );
  }

  // Adjust refresh rates based on user state
  adjustRefreshRates(userId) {
    const state = this.refreshStates.get(userId);
    const intervals = this.refreshIntervals.get(userId);
    
    if (!state || !intervals) return;

    const isActive = this.isUserActive(userId);
    const multiplier = isActive ? 1 : 0.3; // Slow down when inactive

    // Adjust intervals
    Object.entries(intervals).forEach(([type, interval]) => {
      if (interval.id) {
        clearInterval(interval.id);
      }

      const config = this.refreshConfig[type];
      const newInterval = Math.max(
        config.interval * (1 / multiplier),
        1000 // Minimum 1 second
      );

      interval.id = setInterval(() => {
        this.performRefresh(userId, type);
      }, newInterval);
    });

    console.log(`⚡ Adjusted refresh rates for user ${userId} (active: ${isActive})`);
  }

  // Trigger immediate refresh for specific types
  triggerImmediateRefresh(userId, types = ['frequent']) {
    types.forEach(type => {
      this.performRefresh(userId, type);
    });
  }

  // Start global manager
  startGlobalManager() {
    // Cleanup inactive users every 5 minutes
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 5 * 60 * 1000);

    // Performance optimization every minute
    setInterval(() => {
      this.optimizePerformance();
    }, 60 * 1000);

    console.log('🌐 Global refresh manager started');
  }

  // Cleanup inactive users
  cleanupInactiveUsers() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    let cleanedCount = 0;

    for (const [userId, state] of this.refreshStates.entries()) {
      if (now - state.lastActivity > inactiveThreshold) {
        this.unregisterUser(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} inactive refresh users`);
    }
  }

  // Optimize performance based on usage patterns
  optimizePerformance() {
    let totalUsers = this.refreshStates.size;
    let activeUsers = 0;
    let totalRefreshes = 0;

    for (const [userId, state] of this.refreshStates.entries()) {
      if (this.isUserActive(userId)) {
        activeUsers++;
      }
      
      for (const count of state.refreshCounters.values()) {
        totalRefreshes += count;
      }
    }

    const stats = {
      totalUsers,
      activeUsers,
      totalRefreshes,
      timestamp: Date.now()
    };

    // Emit performance stats
    this.emit('performance:stats', stats);
    
    console.log(`📊 Refresh Performance:`, stats);
  }

  // Get user refresh statistics
  getUserStats(userId) {
    const state = this.refreshStates.get(userId);
    const activity = this.userActivity.get(userId);
    
    if (!state || !activity) return null;

    return {
      isActive: this.isUserActive(userId),
      lastActivity: state.lastActivity,
      currentPage: state.currentPage,
      visibilityState: state.visibilityState,
      refreshCounters: Object.fromEntries(state.refreshCounters),
      errorCount: state.refreshErrors.length,
      activity: {
        interactions: activity.interactions,
        scrolls: activity.scrolls,
        clicks: activity.clicks,
        pageViews: activity.pageViews.length
      },
      preferences: state.preferences
    };
  }

  // Update user preferences
  updateUserPreferences(userId, preferences) {
    const state = this.refreshStates.get(userId);
    if (!state) return false;

    state.preferences = {
      ...state.preferences,
      ...preferences
    };

    // Restart intervals if auto-refresh was toggled
    if ('autoRefresh' in preferences) {
      this.unregisterUser(userId);
      this.registerUser(userId, state.preferences);
    }

    return true;
  }

  // Manual refresh trigger
  manualRefresh(userId, categories = []) {
    const state = this.refreshStates.get(userId);
    if (!state) return false;

    const categoriesToRefresh = categories.length > 0 ? 
      categories : 
      Object.values(this.refreshConfig).flatMap(config => config.categories);

    // Trigger immediate refresh for specified categories
    categoriesToRefresh.forEach(category => {
      this.refreshDataCategory(userId, category, 'manual');
    });

    console.log(`🔄 Manual refresh triggered for user ${userId}:`, categoriesToRefresh);
    return true;
  }
}

// Singleton instance
const seamlessRefreshManager = new SeamlessRefreshManager();

export default seamlessRefreshManager;