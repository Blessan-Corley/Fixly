// lib/analytics.js - Optimized Analytics (Backward Compatible)
const { cache, getRedisClient } = require('./redis');
const { getSocket } = require('./socket');
const { 
  Analytics: OptimizedAnalytics, 
  getAnalytics, 
  EVENT_TYPES,
  AGGREGATION_TYPES 
} = require('./analytics/index');

// Initialize optimized analytics
let analytics = null;

async function initializeAnalytics() {
  if (!analytics) {
    try {
      const redisClient = await getRedisClient(); // Get actual Redis client
      const socketInstance = getSocket();
      
      if (!redisClient) {
        console.warn('⚠️ No Redis client available, analytics will work with limited functionality');
      }
      
      analytics = getAnalytics(redisClient, socketInstance);
      
      // Initialize if not already done
      if (analytics && !analytics.isInitialized) {
        analytics.initialize().catch(error => {
          console.warn('⚠️ Analytics initialization failed:', error.message);
          // Don't crash, just continue
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize analytics, continuing without it:', error.message);
      // Create a dummy analytics object that doesn't crash
      analytics = {
        isInitialized: true,
        trackEvent: () => Promise.resolve(false),
        updateMetrics: () => Promise.resolve(),
        generateSessionId: () => `sess_${Date.now()}`,
        generateEventId: () => `evt_${Date.now()}`
      };
    }
  }
  return analytics;
}

// Export event types for backward compatibility
const EventTypes = EVENT_TYPES;

// Legacy Analytics class for backward compatibility
class Analytics {
  constructor() {
    this.optimizedAnalytics = null;
    this.initPromise = null;
  }

  async _ensureInitialized() {
    if (!this.optimizedAnalytics && !this.initPromise) {
      this.initPromise = initializeAnalytics();
      this.optimizedAnalytics = await this.initPromise;
    } else if (this.initPromise) {
      this.optimizedAnalytics = await this.initPromise;
    }
    return this.optimizedAnalytics;
  }

  // Legacy method - redirects to optimized version
  async trackEvent(eventType, properties = {}, userId = null) {
    const analyticsInstance = await this._ensureInitialized();
    if (!analyticsInstance) {
      console.error('❌ Analytics not initialized');
      return false;
    }
    
    return await analyticsInstance.trackEvent(eventType, properties, userId);
  }

  // Legacy method for updating metrics
  async updateMetrics(metrics) {
    const analyticsInstance = await this._ensureInitialized();
    if (!analyticsInstance) return;
    
    return await analyticsInstance.updateMetrics(metrics);
  }

  // Legacy method for generating session ID
  generateSessionId() {
    // This can be synchronous as it doesn't need Redis
    return `sess_${Date.now()}`;
  }

  // Legacy method for generating event ID
  generateEventId() {
    // This can be synchronous as it doesn't need Redis  
    return `evt_${Date.now()}`;
  }
}

// Create singleton for backward compatibility
const analyticsInstance = new Analytics();

// Export functions for backward compatibility
async function trackEvent(eventType, properties = {}, userId = null) {
  return await analyticsInstance.trackEvent(eventType, properties, userId);
}

async function updateMetrics(metrics) {
  return await analyticsInstance.updateMetrics(metrics);
}

function generateSessionId() {
  return analyticsInstance.generateSessionId();
}

function generateEventId() {
  return analyticsInstance.generateEventId();
}

// Export optimized analytics for new usage  
let optimizedAnalyticsInstance = null;
initializeAnalytics().then(instance => {
  optimizedAnalyticsInstance = instance;
}).catch(error => {
  console.warn('Analytics initialization failed:', error.message);
});

// Module exports
module.exports = {
  Analytics,
  EventTypes,
  trackEvent,
  updateMetrics,
  generateSessionId,
  generateEventId,
  analytics: optimizedAnalyticsInstance,
  AGGREGATION_TYPES,
  OptimizedAnalytics
};