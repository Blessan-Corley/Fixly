// lib/analytics-client.js - Client-side Analytics
export const EventTypes = {
  PAGE_VIEW: 'page_view',
  USER_ACTION: 'user_action',
  JOB_INTERACTION: 'job_interaction',
  SEARCH: 'search',
  ERROR: 'error',
  PERFORMANCE: 'performance'
};

class ClientAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.isInitialized = true;
    this.eventQueue = [];
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    // Only add event listeners on client side
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async trackEvent(eventType, eventData = {}, context = {}) {
    try {
      const event = {
        id: this.generateEventId(),
        type: eventType,
        data: eventData,
        context: {
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          ...context
        }
      };

      if (this.isOnline) {
        // Try to send immediately
        const response = await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });

        return response.ok;
      } else {
        // Queue for later
        this.eventQueue.push(event);
        return false;
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error.message);
      // Store in queue for retry
      if (eventType && eventData) {
        this.eventQueue.push({
          id: this.generateEventId(),
          type: eventType,
          data: eventData,
          context: {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            error: error.message
          }
        });
      }
      return false;
    }
  }

  async updateMetrics(metricName, value = 1, metadata = {}) {
    return this.trackEvent(EventTypes.USER_ACTION, {
      metric: metricName,
      value,
      metadata
    });
  }

  async flushQueue() {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      const response = await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events })
      });

      if (!response.ok) {
        // Put events back in queue
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.warn('Failed to flush analytics queue:', error.message);
      // Keep events in queue for next try
    }
  }

  // Track page views automatically
  trackPageView(route, metadata = {}) {
    return this.trackEvent(EventTypes.PAGE_VIEW, {
      route,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      ...metadata
    });
  }

  // Track user interactions
  trackUserAction(action, element, metadata = {}) {
    return this.trackEvent(EventTypes.USER_ACTION, {
      action,
      element,
      ...metadata
    });
  }

  // Track search events
  trackSearch(query, filters = {}, results = 0) {
    return this.trackEvent(EventTypes.SEARCH, {
      query,
      filters,
      results,
      timestamp: new Date().toISOString()
    });
  }

  // Track errors
  trackError(error, context = {}) {
    return this.trackEvent(EventTypes.ERROR, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  // Track performance metrics
  trackPerformance(metric, value, context = {}) {
    return this.trackEvent(EventTypes.PERFORMANCE, {
      metric,
      value,
      ...context
    });
  }
}

// Create singleton instance
let analyticsInstance = null;

export function getAnalytics() {
  // Only create instance on client side
  if (typeof window === 'undefined') {
    return {
      trackEvent: () => Promise.resolve(false),
      updateMetrics: () => Promise.resolve(false),
      trackPageView: () => Promise.resolve(false),
      trackUserAction: () => Promise.resolve(false),
      trackSearch: () => Promise.resolve(false),
      trackError: () => Promise.resolve(false),
      trackPerformance: () => Promise.resolve(false),
      flushQueue: () => Promise.resolve()
    };
  }
  
  if (!analyticsInstance) {
    analyticsInstance = new ClientAnalytics();
  }
  return analyticsInstance;
}

// Export singleton for backward compatibility (lazy)
export let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics();
} else {
  // Server-side fallback
  analytics = getAnalytics();
}

// Auto-track page views on route changes (for Next.js)
if (typeof window !== 'undefined') {
  // Track initial page view
  analytics.trackPageView(window.location.pathname);
  
  // Track navigation changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    analytics.trackPageView(window.location.pathname);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    analytics.trackPageView(window.location.pathname);
  };
  
  window.addEventListener('popstate', () => {
    analytics.trackPageView(window.location.pathname);
  });
}