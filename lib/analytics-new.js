// lib/analytics.js - Optimized Analytics (Backward Compatible)
const { cache } = require('./redis');
const { getSocket } = require('./socket');
const { 
  Analytics: OptimizedAnalytics, 
  getAnalytics, 
  EVENT_TYPES,
  AGGREGATION_TYPES 
} = require('./analytics/index');

// Initialize optimized analytics
let analytics = null;

function initializeAnalytics() {
  if (!analytics) {
    const redisClient = cache.redis; // Get Redis client from cache
    const socketInstance = getSocket();
    analytics = getAnalytics(redisClient, socketInstance);
    
    // Initialize if not already done
    if (analytics && !analytics.isInitialized) {
      analytics.initialize().catch(error => {
        console.error('❌ Failed to initialize analytics:', error);
      });
    }
  }
  return analytics;
}

// Export event types for backward compatibility
const EventTypes = EVENT_TYPES;

// Legacy Analytics class for backward compatibility
class Analytics {
  constructor() {
    this.optimizedAnalytics = initializeAnalytics();
  }

  // Legacy method - redirects to optimized version
  async trackEvent(eventType, properties = {}, userId = null) {
    const analyticsInstance = this.optimizedAnalytics || initializeAnalytics();
    if (!analyticsInstance) {
      console.error('❌ Analytics not initialized');
      return false;
    }
    
    return await analyticsInstance.trackEvent(eventType, properties, userId);
  }

  // Legacy method for updating metrics
  async updateMetrics(metrics) {
    const analyticsInstance = this.optimizedAnalytics || initializeAnalytics();
    if (!analyticsInstance) return;
    
    return await analyticsInstance.updateMetrics(metrics);
  }

  // Legacy method for generating session ID
  generateSessionId() {
    const analyticsInstance = this.optimizedAnalytics || initializeAnalytics();
    if (!analyticsInstance) return `sess_${Date.now()}`;
    
    return analyticsInstance.generateSessionId();
  }

  // Legacy method for generating event ID
  generateEventId() {
    const analyticsInstance = this.optimizedAnalytics || initializeAnalytics();
    if (!analyticsInstance) return `evt_${Date.now()}`;
    
    return analyticsInstance.generateEventId();
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
const optimizedAnalyticsInstance = initializeAnalytics();

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