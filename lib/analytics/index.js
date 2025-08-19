// lib/analytics/index.js - Optimized Analytics System
const { ANALYTICS_CONFIG, EVENT_TYPES, AGGREGATION_TYPES } = require('./config');
const { EventBuffer } = require('./event-buffer');
const { AnalyticsStorage } = require('./storage');

/**
 * High-performance analytics system with buffering, compression, and real-time features
 */
class Analytics {
  constructor(redisClient, socketInstance) {
    this.redis = redisClient;
    this.socket = socketInstance;
    this.storage = new AnalyticsStorage(redisClient);
    this.buffer = new EventBuffer(this.storage);
    this.realTimeQueue = [];
    this.sessionCache = new Map();
    this.isInitialized = false;
    
    this.metrics = {
      eventsTracked: 0,
      realTimeEvents: 0,
      errors: 0,
      sessionCount: 0
    };
  }

  /**
   * Initialize the analytics system
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Analytics System...');
      
      // Test Redis connection with timeout
      if (this.redis) {
        await Promise.race([
          this.redis.ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
          )
        ]);
      } else {
        console.warn('⚠️ No Redis client available for analytics');
      }
      
      this.isInitialized = true;
      console.log('✅ Analytics System initialized successfully');
      
    } catch (error) {
      console.warn('⚠️ Analytics System initialization failed, continuing without Redis:', error.message);
      // Don't throw - allow system to work without Redis
      this.isInitialized = true;
    }
  }

  /**
   * Track a single event with optimizations
   * @param {string} eventType - Type of event
   * @param {Object} properties - Event properties
   * @param {string} userId - User ID (optional)
   * @param {Object} options - Additional options
   */
  async trackEvent(eventType, properties = {}, userId = null, options = {}) {
    try {
      // Validate event type
      if (!eventType || !Object.values(EVENT_TYPES).includes(eventType)) {
        console.warn('⚠️ Invalid event type:', eventType);
        return false;
      }

      // Create event object
      const event = {
        type: eventType,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          sessionId: this.getOrCreateSessionId(userId),
          userAgent: properties.userAgent,
          ip: properties.ip,
          page: properties.page,
          referrer: properties.referrer
        },
        userId,
        id: this.generateEventId(),
        realTime: options.realTime !== false // Default to true
      };

      // Add to buffer
      const bufferSuccess = this.buffer.addEvent(event);
      if (!bufferSuccess) {
        this.metrics.errors++;
        return false;
      }

      // Real-time processing for enabled events
      if (ANALYTICS_CONFIG.enableRealTime && event.realTime) {
        this.processRealTimeEvent(event);
      }

      this.metrics.eventsTracked++;
      return true;

    } catch (error) {
      console.error('❌ Error tracking event:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Process real-time event for dashboard/admin
   * @param {Object} event - Event object
   */
  processRealTimeEvent(event) {
    try {
      if (!this.socket) return;

      // Emit to admin dashboard
      this.socket.to('admin_room').emit('analytics_event', {
        type: event.type,
        userId: event.userId,
        timestamp: event.properties.timestamp,
        properties: this.sanitizeProperties(event.properties)
      });

      // Emit user-specific events
      if (event.userId) {
        this.socket.to(`user:${event.userId}`).emit('user_analytics', {
          type: event.type,
          timestamp: event.properties.timestamp
        });
      }

      this.metrics.realTimeEvents++;

    } catch (error) {
      console.error('❌ Error processing real-time event:', error);
    }
  }

  /**
   * Sanitize properties for real-time transmission
   * @param {Object} properties - Event properties
   * @returns {Object} Sanitized properties
   */
  sanitizeProperties(properties) {
    const sanitized = { ...properties };
    
    // Remove sensitive data
    delete sanitized.ip;
    delete sanitized.userAgent;
    delete sanitized.sessionId;
    
    return sanitized;
  }

  /**
   * Get or create session ID for user
   * @param {string} userId - User ID
   * @returns {string} Session ID
   */
  getOrCreateSessionId(userId) {
    if (!userId) return this.generateSessionId();

    if (this.sessionCache.has(userId)) {
      return this.sessionCache.get(userId);
    }

    const sessionId = this.generateSessionId();
    this.sessionCache.set(userId, sessionId);
    this.metrics.sessionCount++;
    
    // Auto-expire sessions after 24 hours
    setTimeout(() => {
      this.sessionCache.delete(userId);
    }, 24 * 60 * 60 * 1000);

    return sessionId;
  }

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update metrics with batch operations
   * @param {Object} metrics - Metrics to update
   */
  async updateMetrics(metrics) {
    try {
      const updates = [];
      
      Object.entries(metrics).forEach(([key, value]) => {
        updates.push(this.redis.incrBy(`analytics:metrics:${key}`, value));
      });

      await Promise.all(updates);

    } catch (error) {
      console.error('❌ Error updating metrics:', error);
    }
  }

  /**
   * Get analytics data with caching
   * @param {string} eventType - Event type
   * @param {string} period - Time period
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(eventType, period = 'daily', options = {}) {
    try {
      const cacheKey = `analytics:cache:${eventType}:${period}`;
      
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached && !options.skipCache) {
        return JSON.parse(cached);
      }

      // Generate fresh data
      const data = await this.generateAnalyticsData(eventType, period, options);
      
      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(data));
      
      return data;

    } catch (error) {
      console.error('❌ Error getting analytics:', error);
      return {};
    }
  }

  /**
   * Generate analytics data
   * @param {string} eventType - Event type
   * @param {string} period - Time period
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Analytics data
   */
  async generateAnalyticsData(eventType, period, options) {
    const data = {
      eventType,
      period,
      timestamp: new Date().toISOString(),
      metrics: {}
    };

    try {
      // Get event counts
      data.metrics.total = await this.storage.getEventCount(eventType, 'total');
      data.metrics.daily = await this.storage.getEventCount(eventType, 'daily');
      data.metrics.hourly = await this.storage.getEventCount(eventType, 'hourly');
      
      // Get aggregated metrics if available
      if (options.includeAggregations) {
        const aggregations = ['sum', 'average', 'max', 'min'];
        for (const agg of aggregations) {
          try {
            data.metrics[agg] = await this.storage.getAggregatedMetric(
              eventType, 
              options.metric || 'value', 
              agg
            );
          } catch (error) {
            data.metrics[agg] = 0;
          }
        }
      }

    } catch (error) {
      console.error('❌ Error generating analytics data:', error);
    }

    return data;
  }

  /**
   * Get system metrics
   * @returns {Object} System metrics
   */
  getSystemMetrics() {
    return {
      analytics: this.metrics,
      buffer: this.buffer.getMetrics(),
      storage: this.storage.getMetrics(),
      sessions: this.sessionCache.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  /**
   * Gracefully shutdown analytics system
   */
  async shutdown() {
    console.log('🧹 Shutting down Analytics System...');
    
    try {
      await this.buffer.shutdown();
      await this.storage.cleanup();
      this.sessionCache.clear();
      
      console.log('✅ Analytics System shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during analytics shutdown:', error);
    }
  }
}

// Create singleton instance
let analyticsInstance = null;

/**
 * Get or create analytics instance
 * @param {Object} redisClient - Redis client
 * @param {Object} socketInstance - Socket.io instance
 * @returns {Analytics} Analytics instance
 */
function getAnalytics(redisClient, socketInstance) {
  if (!analyticsInstance && redisClient) {
    analyticsInstance = new Analytics(redisClient, socketInstance);
  }
  return analyticsInstance;
}

module.exports = {
  Analytics,
  getAnalytics,
  EVENT_TYPES,
  AGGREGATION_TYPES,
  ANALYTICS_CONFIG
};