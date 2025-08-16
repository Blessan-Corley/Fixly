// lib/analytics.js - Real-time analytics and event tracking system
import { cache, analytics as redisAnalytics } from './redis';
import { io } from './socket';

// Event types for tracking
export const EventTypes = {
  // User Events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_PROFILE_UPDATE: 'user_profile_update',
  USER_VERIFICATION: 'user_verification',
  
  // Job Events
  JOB_POSTED: 'job_posted',
  JOB_VIEWED: 'job_viewed',
  JOB_APPLIED: 'job_applied',
  JOB_ACCEPTED: 'job_accepted',
  JOB_COMPLETED: 'job_completed',
  JOB_CANCELLED: 'job_cancelled',
  JOB_RATED: 'job_rated',
  
  // Search Events
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  LOCATION_SEARCH: 'location_search',
  
  // Payment Events
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  PAYOUT_REQUESTED: 'payout_requested',
  
  // Engagement Events
  MESSAGE_SENT: 'message_sent',
  COMMENT_POSTED: 'comment_posted',
  NOTIFICATION_CLICKED: 'notification_clicked',
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  
  // Admin Events
  ADMIN_ACTION: 'admin_action',
  USER_BANNED: 'user_banned',
  USER_UNBANNED: 'user_unbanned',
  
  // Error Events
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  CLIENT_ERROR: 'client_error'
};

// Analytics class for tracking events and metrics
export class Analytics {
  constructor() {
    this.buffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.startBuffer();
  }

  // Start buffering system for batch processing
  startBuffer() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // Track a single event
  async trackEvent(eventType, properties = {}, userId = null) {
    const event = {
      type: eventType,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionId: properties.sessionId || this.generateSessionId(),
        userAgent: properties.userAgent,
        ip: properties.ip,
        page: properties.page,
        referrer: properties.referrer
      },
      userId,
      id: this.generateEventId()
    };

    // Add to buffer for batch processing
    this.buffer.push(event);

    // Real-time event for dashboard
    if (io) {
      io.to('admin_room').emit('analytics_event', {
        type: eventType,
        userId,
        timestamp: event.properties.timestamp,
        properties: event.properties
      });
    }

    // Immediate processing for critical events
    if (this.isCriticalEvent(eventType)) {
      await this.processEvent(event);
    }

    // Flush buffer if it's full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    return event.id;
  }

  // Process individual event
  async processEvent(event) {
    try {
      // Store in Redis with TTL
      const eventKey = `event:${event.id}`;
      await cache.set(eventKey, event, 86400); // 24 hours

      // Update real-time metrics
      await this.updateMetrics(event);
      
      // Store in time-series data
      await this.storeTimeSeries(event);
      
      // Update user analytics
      if (event.userId) {
        await this.updateUserAnalytics(event.userId, event);
      }

    } catch (error) {
      console.error('Failed to process analytics event:', error);
    }
  }

  // Update real-time metrics
  async updateMetrics(event) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = new Date().getHours();
    
    // Daily metrics
    await cache.incrementCounter(`metrics:daily:${event.type}:${date}`);
    await cache.incrementCounter(`metrics:total:${event.type}`);
    
    // Hourly metrics for real-time dashboard
    await cache.incrementCounter(`metrics:hourly:${event.type}:${date}:${hour}`);
    
    // User-specific metrics
    if (event.userId) {
      await cache.incrementCounter(`user_metrics:${event.userId}:${event.type}:${date}`);
    }

    // Real-time counters with expiry
    await cache.incrementCounterWithTTL(`realtime:${event.type}`, 300); // 5 minutes
  }

  // Store time-series data for trending analysis
  async storeTimeSeries(event) {
    const timestamp = Date.now();
    const timeSeriesKey = `timeseries:${event.type}`;
    
    // Store with score as timestamp for time-based queries
    await cache.addToSortedSet(timeSeriesKey, timestamp, JSON.stringify({
      timestamp,
      userId: event.userId,
      properties: event.properties
    }));

    // Cleanup old data (keep last 30 days)
    const thirtyDaysAgo = timestamp - (30 * 24 * 60 * 60 * 1000);
    await cache.removeFromSortedSetByScore(timeSeriesKey, 0, thirtyDaysAgo);
  }

  // Update user-specific analytics
  async updateUserAnalytics(userId, event) {
    const userKey = `user_analytics:${userId}`;
    
    // Get existing data
    let userData = await cache.get(userKey) || {
      totalEvents: 0,
      eventCounts: {},
      lastActivity: null,
      sessionCount: 0,
      devices: new Set(),
      pages: new Set()
    };

    // Update counters
    userData.totalEvents++;
    userData.eventCounts[event.type] = (userData.eventCounts[event.type] || 0) + 1;
    userData.lastActivity = event.properties.timestamp;

    // Track devices and pages
    if (event.properties.userAgent) {
      userData.devices.add(this.parseUserAgent(event.properties.userAgent));
    }
    if (event.properties.page) {
      userData.pages.add(event.properties.page);
    }

    // Session tracking
    if (event.type === EventTypes.SESSION_START) {
      userData.sessionCount++;
    }

    // Convert Sets to Arrays for storage
    userData.devices = Array.from(userData.devices);
    userData.pages = Array.from(userData.pages);

    // Store with 30-day TTL
    await cache.set(userKey, userData, 2592000);
  }

  // Flush buffer - process all buffered events
  async flush() {
    if (this.buffer.length === 0) return;

    const eventsToProcess = [...this.buffer];
    this.buffer = [];

    try {
      await Promise.all(eventsToProcess.map(event => this.processEvent(event)));
    } catch (error) {
      console.error('Failed to flush analytics buffer:', error);
      // Re-add failed events to buffer
      this.buffer.unshift(...eventsToProcess);
    }
  }

  // Get analytics data for dashboard
  async getAnalytics(timeRange = '7d', eventTypes = []) {
    const now = new Date();
    const daysBack = parseInt(timeRange.replace('d', ''));
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    try {
      const analytics = {
        summary: {},
        timeSeries: {},
        topEvents: [],
        userMetrics: {},
        realTime: {}
      };

      // Get summary metrics
      for (const eventType of Object.values(EventTypes)) {
        if (eventTypes.length === 0 || eventTypes.includes(eventType)) {
          analytics.summary[eventType] = await cache.get(`metrics:total:${eventType}`) || 0;
        }
      }

      // Get time series data
      for (const eventType of (eventTypes.length > 0 ? eventTypes : Object.values(EventTypes).slice(0, 5))) {
        const timeSeriesKey = `timeseries:${eventType}`;
        const data = await cache.getSortedSetByScore(
          timeSeriesKey,
          startDate.getTime(),
          now.getTime()
        );
        analytics.timeSeries[eventType] = data.map(item => JSON.parse(item));
      }

      // Get real-time metrics (last 5 minutes)
      for (const eventType of Object.values(EventTypes).slice(0, 10)) {
        analytics.realTime[eventType] = await cache.get(`realtime:${eventType}`) || 0;
      }

      return analytics;

    } catch (error) {
      console.error('Failed to get analytics data:', error);
      return { error: 'Failed to fetch analytics data' };
    }
  }

  // Get user journey analysis
  async getUserJourney(userId, timeRange = '7d') {
    try {
      const userKey = `user_analytics:${userId}`;
      const userData = await cache.get(userKey);
      
      if (!userData) {
        return { error: 'No analytics data found for user' };
      }

      // Get user's event timeline
      const timeline = [];
      for (const eventType of Object.values(EventTypes)) {
        const timeSeriesKey = `timeseries:${eventType}`;
        const events = await cache.getSortedSetByScore(timeSeriesKey, 0, Date.now());
        
        const userEvents = events
          .map(item => JSON.parse(item))
          .filter(event => event.userId === userId)
          .sort((a, b) => a.timestamp - b.timestamp);
          
        timeline.push(...userEvents);
      }

      return {
        profile: userData,
        timeline: timeline.slice(-100), // Last 100 events
        insights: {
          mostActiveHour: this.getMostActiveHour(timeline),
          preferredDevice: userData.devices[0],
          engagementScore: this.calculateEngagementScore(userData),
          sessionDuration: this.getAverageSessionDuration(timeline)
        }
      };

    } catch (error) {
      console.error('Failed to get user journey:', error);
      return { error: 'Failed to fetch user journey' };
    }
  }

  // Utility methods
  isCriticalEvent(eventType) {
    return [
      EventTypes.ERROR_OCCURRED,
      EventTypes.PAYMENT_FAILED,
      EventTypes.USER_BANNED,
      EventTypes.API_ERROR
    ].includes(eventType);
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parseUserAgent(userAgent) {
    // Simple device detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'mobile';
    if (/Tablet/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  getMostActiveHour(timeline) {
    const hourCounts = {};
    timeline.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );
  }

  calculateEngagementScore(userData) {
    // Simple engagement score based on event diversity and frequency
    const eventTypeCount = Object.keys(userData.eventCounts).length;
    const totalEvents = userData.totalEvents;
    const sessionCount = userData.sessionCount || 1;
    
    return Math.min(100, (eventTypeCount * 10) + (totalEvents / sessionCount));
  }

  getAverageSessionDuration(timeline) {
    // Calculate average session duration from session start/end events
    const sessions = [];
    let currentSession = null;
    
    timeline.forEach(event => {
      if (event.type === EventTypes.SESSION_START) {
        currentSession = { start: event.timestamp, end: null };
      } else if (event.type === EventTypes.SESSION_END && currentSession) {
        currentSession.end = event.timestamp;
        sessions.push(currentSession);
        currentSession = null;
      }
    });
    
    if (sessions.length === 0) return 0;
    
    const totalDuration = sessions.reduce((sum, session) => 
      sum + (session.end - session.start), 0
    );
    
    return totalDuration / sessions.length / 1000 / 60; // Minutes
  }

  // Funnel analysis
  async getFunnelAnalysis(steps, timeRange = '7d') {
    try {
      const results = {};
      let previousCount = null;
      
      for (const step of steps) {
        const count = await cache.get(`metrics:total:${step}`) || 0;
        const conversionRate = previousCount ? (count / previousCount * 100) : 100;
        
        results[step] = {
          count,
          conversionRate: Math.round(conversionRate * 100) / 100
        };
        
        previousCount = count;
      }
      
      return results;
      
    } catch (error) {
      console.error('Failed to get funnel analysis:', error);
      return { error: 'Failed to calculate funnel' };
    }
  }
}

// Create singleton instance
export const analytics = new Analytics();

// Convenience methods for common tracking
export const trackPageView = (page, userId, properties = {}) => {
  return analytics.trackEvent(EventTypes.PAGE_VIEW, { page, ...properties }, userId);
};

export const trackUserAction = (action, userId, properties = {}) => {
  return analytics.trackEvent(action, properties, userId);
};

export const trackError = (error, userId, properties = {}) => {
  return analytics.trackEvent(EventTypes.ERROR_OCCURRED, {
    message: error.message,
    stack: error.stack,
    ...properties
  }, userId);
};

export const trackJobEvent = (eventType, jobId, userId, properties = {}) => {
  return analytics.trackEvent(eventType, { jobId, ...properties }, userId);
};

export const trackSearchEvent = (query, filters, userId, properties = {}) => {
  return analytics.trackEvent(EventTypes.SEARCH_PERFORMED, {
    query,
    filters,
    ...properties
  }, userId);
};

export default analytics;