// utils/performanceMonitoring.js - Comprehensive performance monitoring system
'use client';

import { analytics, EventTypes } from '../lib/analytics-client';

// Performance metrics collection
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = typeof window !== 'undefined' && 'performance' in window;
    this.sessionId = this.generateSessionId();
    
    if (this.isEnabled) {
      this.initializeObservers();
      this.startPerformanceTracking();
    }
  }

  // Initialize performance observers
  initializeObservers() {
    try {
      // Navigation timing
      if ('PerformanceObserver' in window) {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleNavigationTiming(entry);
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);

        // Resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleResourceTiming(entry);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);

        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('LCP', lastEntry.startTime, {
            element: lastEntry.element?.tagName || 'unknown',
            url: lastEntry.url || window.location.href
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('FID', entry.processingStart - entry.startTime, {
              eventType: entry.name,
              target: entry.target?.tagName || 'unknown'
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);

        // Cumulative Layout Shift (CLS)
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
              this.recordMetric('CLS', clsScore, {
                sources: entry.sources?.map(s => s.node?.tagName).join(',') || 'unknown'
              });
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);

        // Long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('LONG_TASK', entry.duration, {
              startTime: entry.startTime,
              attribution: entry.attribution?.[0]?.name || 'unknown'
            });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      }

      // Memory usage monitoring
      if (window.performance?.memory) {
        this.startMemoryMonitoring();
      }

    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  // Handle navigation timing
  handleNavigationTiming(entry) {
    const metrics = {
      DNS: entry.domainLookupEnd - entry.domainLookupStart,
      TCP: entry.connectEnd - entry.connectStart,
      TLS: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      TTFB: entry.responseStart - entry.requestStart,
      FCP: this.getFirstContentfulPaint(),
      DOMContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      Load: entry.loadEventEnd - entry.loadEventStart,
      Total: entry.loadEventEnd - entry.navigationStart
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        this.recordMetric(`NAV_${name}`, value, {
          type: entry.type,
          redirectCount: entry.redirectCount
        });
      }
    });

    // Track page load performance
    this.trackPageLoad(metrics);
  }

  // Handle resource timing
  handleResourceTiming(entry) {
    const resourceType = this.getResourceType(entry.name);
    const metrics = {
      duration: entry.duration,
      size: entry.transferSize || 0,
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      download: entry.responseEnd - entry.responseStart
    };

    this.recordMetric(`RESOURCE_${resourceType}`, metrics.duration, {
      name: entry.name,
      size: metrics.size,
      dns: metrics.dns,
      tcp: metrics.tcp,
      download: metrics.download,
      cached: metrics.size === 0
    });

    // Track slow resources
    if (metrics.duration > 1000) { // > 1 second
      this.recordMetric('SLOW_RESOURCE', metrics.duration, {
        name: entry.name,
        type: resourceType,
        size: metrics.size
      });
    }
  }

  // Get resource type from URL
  getResourceType(url) {
    if (url.includes('.js')) return 'SCRIPT';
    if (url.includes('.css')) return 'STYLE';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) return 'IMAGE';
    if (url.match(/\.(woff|woff2|ttf|eot)$/i)) return 'FONT';
    if (url.includes('/api/')) return 'API';
    return 'OTHER';
  }

  // Get First Contentful Paint
  getFirstContentfulPaint() {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  // Start memory monitoring
  startMemoryMonitoring() {
    const trackMemory = () => {
      if (window.performance?.memory) {
        const memory = window.performance.memory;
        this.recordMetric('MEMORY_USED', memory.usedJSHeapSize / 1048576, {
          total: memory.totalJSHeapSize / 1048576,
          limit: memory.jsHeapSizeLimit / 1048576
        });

        // Warning for high memory usage
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          this.recordMetric('HIGH_MEMORY_USAGE', usagePercent, {
            used: memory.usedJSHeapSize / 1048576,
            limit: memory.jsHeapSizeLimit / 1048576
          });
        }
      }
    };

    // Track memory every 30 seconds
    setInterval(trackMemory, 30000);
    trackMemory(); // Initial measurement
  }

  // Start general performance tracking
  startPerformanceTracking() {
    // Track frame rate
    let frameCount = 0;
    let lastTime = performance.now();
    
    const trackFrameRate = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) { // Every second
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.recordMetric('FPS', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(trackFrameRate);
    };
    
    requestAnimationFrame(trackFrameRate);

    // Track user interactions
    this.trackUserInteractions();

    // Track API performance
    this.trackAPIPerformance();
  }

  // Track user interactions
  trackUserInteractions() {
    const interactionStart = new Map();

    // Click interactions
    document.addEventListener('click', (event) => {
      const startTime = performance.now();
      const element = event.target.closest('[data-track]') || event.target;
      const identifier = element.id || element.className || element.tagName;
      
      interactionStart.set('click_' + identifier, startTime);
      
      // Measure time to next paint
      requestAnimationFrame(() => {
        const endTime = performance.now();
        this.recordMetric('INTERACTION_CLICK', endTime - startTime, {
          element: identifier,
          x: event.clientX,
          y: event.clientY
        });
      });
    });

    // Input interactions
    let inputStartTime;
    document.addEventListener('input', (event) => {
      if (!inputStartTime) {
        inputStartTime = performance.now();
      }
      
      clearTimeout(this.inputTimeout);
      this.inputTimeout = setTimeout(() => {
        const duration = performance.now() - inputStartTime;
        this.recordMetric('INTERACTION_INPUT', duration, {
          type: event.target.type || 'text',
          length: event.target.value?.length || 0
        });
        inputStartTime = null;
      }, 500);
    });

    // Scroll interactions
    let scrollStartTime;
    let isScrolling = false;
    
    document.addEventListener('scroll', () => {
      if (!isScrolling) {
        scrollStartTime = performance.now();
        isScrolling = true;
      }
      
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        const duration = performance.now() - scrollStartTime;
        this.recordMetric('INTERACTION_SCROLL', duration, {
          scrollY: window.scrollY,
          documentHeight: document.documentElement.scrollHeight
        });
        isScrolling = false;
      }, 150);
    });
  }

  // Track API performance
  trackAPIPerformance() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordMetric('API_REQUEST', duration, {
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status: response.status,
          ok: response.ok,
          cached: response.headers.get('x-cache') === 'HIT'
        });

        // Track slow API calls
        if (duration > 2000) { // > 2 seconds
          this.recordMetric('SLOW_API', duration, {
            url: typeof url === 'string' ? url : url.url,
            status: response.status
          });
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordMetric('API_ERROR', duration, {
          url: typeof url === 'string' ? url : url.url,
          error: error.message
        });
        
        throw error;
      }
    };
  }

  // Record a performance metric
  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Store locally
    this.metrics.set(`${name}_${Date.now()}`, metric);

    // Send to analytics
    analytics.trackEvent(EventTypes.PERFORMANCE_METRIC, {
      metricName: name,
      metricValue: value,
      ...metadata
    });

    // Keep only recent metrics in memory
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }

    // Log critical performance issues
    this.checkPerformanceThresholds(metric);
  }

  // Check performance thresholds
  checkPerformanceThresholds(metric) {
    const thresholds = {
      LCP: 2500, // 2.5 seconds
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      FPS: 30,   // 30 FPS (inverted - lower is worse)
      API_REQUEST: 3000, // 3 seconds
      MEMORY_USED: 100   // 100MB
    };

    const threshold = thresholds[metric.name];
    if (!threshold) return;

    let isIssue = false;
    let severity = 'warning';

    if (metric.name === 'FPS') {
      // For FPS, lower values are worse
      isIssue = metric.value < threshold;
      severity = metric.value < 15 ? 'critical' : 'warning';
    } else if (metric.name === 'CLS') {
      // CLS uses different thresholds
      isIssue = metric.value > threshold;
      severity = metric.value > 0.25 ? 'critical' : 'warning';
    } else {
      // For other metrics, higher values are worse
      isIssue = metric.value > threshold;
      severity = metric.value > (threshold * 2) ? 'critical' : 'warning';
    }

    if (isIssue) {
      analytics.trackEvent(EventTypes.PERFORMANCE_ISSUE, {
        metricName: metric.name,
        metricValue: metric.value,
        threshold,
        severity,
        ...metric.metadata
      });

      // Log critical issues
      if (severity === 'critical') {
        console.warn(`Critical performance issue detected: ${metric.name} = ${metric.value}`, metric);
      }
    }
  }

  // Track page load performance
  trackPageLoad(metrics) {
    const loadScore = this.calculateLoadScore(metrics);
    
    analytics.trackEvent(EventTypes.PAGE_LOAD, {
      ...metrics,
      loadScore,
      userAgent: navigator.userAgent,
      connection: navigator.connection?.effectiveType || 'unknown',
      memory: navigator.deviceMemory || 'unknown'
    });

    // Performance budget monitoring
    this.checkPerformanceBudget(metrics);
  }

  // Calculate load performance score (0-100)
  calculateLoadScore(metrics) {
    const weights = {
      TTFB: 0.2,
      FCP: 0.3,
      DOMContentLoaded: 0.25,
      Load: 0.25
    };

    let score = 100;
    
    // Deduct points based on timing thresholds
    if (metrics.TTFB > 800) score -= 20 * weights.TTFB;
    if (metrics.FCP > 1800) score -= 30 * weights.FCP;
    if (metrics.DOMContentLoaded > 1500) score -= 25 * weights.DOMContentLoaded;
    if (metrics.Load > 3000) score -= 40 * weights.Load;

    return Math.max(0, Math.round(score));
  }

  // Check performance budget
  checkPerformanceBudget(metrics) {
    const budget = {
      Total: 3000,    // 3 seconds total load time
      TTFB: 800,      // 800ms time to first byte
      FCP: 1800,      // 1.8 seconds first contentful paint
      LCP: 2500       // 2.5 seconds largest contentful paint
    };

    const violations = [];
    
    Object.entries(budget).forEach(([metric, threshold]) => {
      if (metrics[metric] && metrics[metric] > threshold) {
        violations.push({
          metric,
          actual: metrics[metric],
          budget: threshold,
          overage: metrics[metric] - threshold
        });
      }
    });

    if (violations.length > 0) {
      analytics.trackEvent(EventTypes.PERFORMANCE_BUDGET_VIOLATION, {
        violations,
        url: window.location.href
      });
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => Date.now() - m.timestamp < 300000); // Last 5 minutes

    const summary = {
      sessionId: this.sessionId,
      timeRange: '5min',
      totalMetrics: recentMetrics.length,
      criticalIssues: recentMetrics.filter(m => 
        (m.name === 'LCP' && m.value > 4000) ||
        (m.name === 'FID' && m.value > 300) ||
        (m.name === 'CLS' && m.value > 0.25) ||
        (m.name === 'API_REQUEST' && m.value > 5000)
      ).length,
      averages: {}
    };

    // Calculate averages for key metrics
    ['LCP', 'FID', 'CLS', 'FPS', 'API_REQUEST'].forEach(metricName => {
      const values = recentMetrics
        .filter(m => m.name === metricName)
        .map(m => m.value);
      
      if (values.length > 0) {
        summary.averages[metricName] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });

    return summary;
  }

  // Generate session ID
  generateSessionId() {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('Failed to disconnect observer:', error);
      }
    });
    this.observers.clear();
    this.metrics.clear();
  }
}

// Real User Monitoring (RUM) utilities
export const RUM = {
  // Initialize RUM
  init() {
    if (typeof window === 'undefined') return;

    this.monitor = new PerformanceMonitor();
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendPerformanceReport();
      }
    });

    // Track before page unload
    window.addEventListener('beforeunload', () => {
      this.sendPerformanceReport();
    });

    // Periodic reporting
    setInterval(() => {
      this.sendPerformanceReport();
    }, 300000); // Every 5 minutes
  },

  // Send performance report
  sendPerformanceReport() {
    if (!this.monitor) return;

    const summary = this.monitor.getPerformanceSummary();
    
    analytics.trackEvent(EventTypes.PERFORMANCE_REPORT, {
      ...summary,
      url: window.location.href,
      timestamp: Date.now()
    });
  },

  // Track custom performance mark
  mark(name) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(name);
    }
  },

  // Measure time between marks
  measure(name, startMark, endMark) {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        window.performance.measure(name, startMark, endMark);
        const measurement = window.performance.getEntriesByName(name)[0];
        
        if (this.monitor) {
          this.monitor.recordMetric('CUSTOM_MEASURE', measurement.duration, {
            name,
            startMark,
            endMark
          });
        }
        
        return measurement.duration;
      } catch (error) {
        console.warn('Failed to measure performance:', error);
        return 0;
      }
    }
    return 0;
  },

  // Get current performance metrics
  getCurrentMetrics() {
    if (!this.monitor) return {};
    return this.monitor.getPerformanceSummary();
  }
};

// Performance optimization recommendations
export const performanceOptimizations = {
  // Analyze current performance and suggest optimizations
  getRecommendations() {
    const metrics = RUM.getCurrentMetrics();
    const recommendations = [];

    // Check LCP
    if (metrics.averages?.LCP?.avg > 2500) {
      recommendations.push({
        type: 'LCP',
        priority: 'high',
        issue: 'Slow Largest Contentful Paint',
        suggestion: 'Optimize main content loading, consider image optimization and resource preloading'
      });
    }

    // Check FID
    if (metrics.averages?.FID?.avg > 100) {
      recommendations.push({
        type: 'FID',
        priority: 'medium',
        issue: 'Slow First Input Delay',
        suggestion: 'Reduce JavaScript execution time, consider code splitting'
      });
    }

    // Check CLS
    if (metrics.averages?.CLS?.avg > 0.1) {
      recommendations.push({
        type: 'CLS',
        priority: 'high',
        issue: 'High Cumulative Layout Shift',
        suggestion: 'Reserve space for dynamic content, avoid layout-inducing CSS changes'
      });
    }

    // Check API performance
    if (metrics.averages?.API_REQUEST?.avg > 2000) {
      recommendations.push({
        type: 'API',
        priority: 'medium',
        issue: 'Slow API requests',
        suggestion: 'Implement request caching, optimize database queries, consider CDN'
      });
    }

    // Check memory usage
    if (metrics.averages?.MEMORY_USED?.avg > 50) {
      recommendations.push({
        type: 'MEMORY',
        priority: 'low',
        issue: 'High memory usage',
        suggestion: 'Review for memory leaks, optimize large objects, implement lazy loading'
      });
    }

    return recommendations;
  },

  // Auto-apply safe optimizations
  autoOptimize() {
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Optimize images
    this.optimizeImages();
    
    // Enable performance hints
    this.enablePerformanceHints();
  },

  preloadCriticalResources() {
    const criticalResources = [
      '/api/user/profile',
      '/fonts/inter.woff2'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      if (resource.includes('.woff')) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      } else if (resource.includes('/api/')) {
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  },

  optimizeImages() {
    // Convert images to WebP if supported
    if (this.supportsWebP()) {
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => {
        const src = img.dataset.src;
        if (src && !src.includes('.webp')) {
          img.dataset.src = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
      });
    }
  },

  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },

  enablePerformanceHints() {
    // Add performance observer for paint timing
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint' && entry.startTime > 3000) {
              console.info('Consider optimizing critical rendering path - FCP is slow');
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        // Silent fail
      }
    }
  }
};

// Export the performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

export default {
  PerformanceMonitor,
  RUM,
  performanceOptimizations,
  performanceMonitor
};