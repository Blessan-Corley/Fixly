// utils/performance.js - Performance monitoring and optimization utilities
import { NextResponse } from 'next/server';

// Performance monitoring class
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      responseTimes: [],
      slowQueries: [],
      cacheHits: 0,
      cacheMisses: 0,
      databaseQueries: 0,
      errors: 0
    };
    this.maxMetrics = 1000;
  }

  // Start timing a request
  startTimer() {
    return {
      start: Date.now(),
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  // End timing and record metrics
  endTimer(timer, success = true) {
    const duration = Date.now() - timer.start;
    
    this.metrics.requests++;
    this.metrics.responseTimes.push(duration);
    
    if (!success) {
      this.metrics.errors++;
    }
    
    // Keep only recent metrics
    if (this.metrics.responseTimes.length > this.maxMetrics) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-this.maxMetrics);
    }
    
    // Record slow queries (> 1 second)
    if (duration > 1000) {
      this.metrics.slowQueries.push({
        id: timer.id,
        duration,
        timestamp: new Date()
      });
      
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-100);
      }
    }
    
    return duration;
  }

  // Record database query
  recordDatabaseQuery(duration, query, success = true) {
    this.metrics.databaseQueries++;
    
    if (duration > 500) { // Slow query threshold
      this.metrics.slowQueries.push({
        type: 'database',
        duration,
        query: query.substring(0, 100), // Truncate for privacy
        timestamp: new Date(),
        success
      });
    }
  }

  // Record cache hit/miss
  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  // Get performance statistics
  getStats() {
    const responseTimes = this.metrics.responseTimes;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;

    return {
      totalRequests: this.metrics.requests,
      averageResponseTime: Math.round(avgResponseTime),
      slowQueries: this.metrics.slowQueries.length,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      databaseQueries: this.metrics.databaseQueries,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 
        ? (this.metrics.errors / this.metrics.requests) * 100 
        : 0
    };
  }

  // Get recent slow queries
  getSlowQueries(limit = 10) {
    return this.metrics.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {
      requests: 0,
      responseTimes: [],
      slowQueries: [],
      cacheHits: 0,
      cacheMisses: 0,
      databaseQueries: 0,
      errors: 0
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Simple in-memory cache (in production, use Redis)
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Set cache entry
  set(key, value, ttl = this.defaultTTL) {
    // Clean up expired entries
    this.cleanup();
    
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  // Get cache entry
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      performanceMonitor.recordCacheMiss();
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      performanceMonitor.recordCacheMiss();
      return null;
    }
    
    performanceMonitor.recordCacheHit();
    return entry.value;
  }

  // Delete cache entry
  delete(key) {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    this.cleanup();
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: performanceMonitor.getStats().cacheHitRate
    };
  }
}

// Global cache instance
export const cache = new SimpleCache();

// Query optimization utilities
export class QueryOptimizer {
  // Optimize MongoDB query with proper indexing hints
  static optimizeQuery(query, options = {}) {
    const optimizedQuery = { ...query };
    
    // Add index hints based on common patterns
    if (optimizedQuery.status && optimizedQuery.createdAt) {
      optimizedQuery.$hint = { status: 1, createdAt: -1 };
    }
    
    if (optimizedQuery.location && optimizedQuery.status) {
      optimizedQuery.$hint = { 'location.city': 1, status: 1 };
    }
    
    // Add query options
    const queryOptions = {
      lean: options.lean !== false, // Use lean by default for better performance
      ...options
    };
    
    return { query: optimizedQuery, options: queryOptions };
  }

  // Pagination helper with cursor-based pagination
  static createPaginationQuery(page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc') {
    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    return { skip, limit, sort };
  }

  // Aggregation pipeline for complex queries
  static createAggregationPipeline(match = {}, project = {}, sort = {}, limit = 0) {
    const pipeline = [];
    
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    
    if (Object.keys(project).length > 0) {
      pipeline.push({ $project: project });
    }
    
    if (Object.keys(sort).length > 0) {
      pipeline.push({ $sort: sort });
    }
    
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }
    
    return pipeline;
  }
}

// Performance middleware
export function withPerformanceMonitoring(handler) {
  return async function performanceWrapper(request) {
    const timer = performanceMonitor.startTimer();
    
    try {
      const response = await handler(request);
      
      // Add performance headers
      if (response instanceof Response) {
        const duration = performanceMonitor.endTimer(timer, true);
        response.headers.set('X-Response-Time', `${duration}ms`);
        response.headers.set('X-Cache-Hit-Rate', `${performanceMonitor.getStats().cacheHitRate}%`);
      }
      
      return response;
    } catch (error) {
      performanceMonitor.endTimer(timer, false);
      throw error;
    }
  };
}

// Database query monitoring
export function monitorDatabaseQuery(queryFn, queryName = 'unknown') {
  return async function monitoredQuery(...args) {
    const start = Date.now();
    
    try {
      const result = await queryFn(...args);
      const duration = Date.now() - start;
      
      performanceMonitor.recordDatabaseQuery(duration, queryName, true);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      performanceMonitor.recordDatabaseQuery(duration, queryName, false);
      throw error;
    }
  };
}

// Image optimization helper
export function optimizeImageUrl(url, options = {}) {
  const { width, height, quality = 80, format = 'webp' } = options;
  
  if (!url || !url.includes('cloudinary')) {
    return url;
  }
  
  let optimizedUrl = url;
  
  // Add Cloudinary transformations
  if (width || height) {
    const transform = `w_${width || 'auto'},h_${height || 'auto'}`;
    optimizedUrl = optimizedUrl.replace('/upload/', `/upload/${transform}/`);
  }
  
  if (quality !== 80) {
    optimizedUrl = optimizedUrl.replace('/upload/', `/upload/q_${quality}/`);
  }
  
  if (format !== 'webp') {
    optimizedUrl = optimizedUrl.replace('/upload/', `/upload/f_${format}/`);
  }
  
  return optimizedUrl;
}

// Lazy loading helper for images
export function createLazyImageProps(src, alt, options = {}) {
  const optimizedSrc = optimizeImageUrl(src, options);
  
  return {
    src: optimizedSrc,
    alt,
    loading: 'lazy',
    decoding: 'async',
    ...options
  };
}

// Compression helper
export function shouldCompressResponse(contentType, contentLength) {
  const compressibleTypes = [
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/xml',
    'text/xml'
  ];
  
  return compressibleTypes.some(type => contentType.includes(type)) && 
         contentLength > 1024; // Only compress responses > 1KB
}

// Performance monitoring API endpoint
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'stats';
  
  switch (type) {
    case 'stats':
      return NextResponse.json({
        performance: performanceMonitor.getStats(),
        cache: cache.getStats(),
        timestamp: new Date().toISOString()
      });
      
    case 'slow-queries':
      return NextResponse.json({
        slowQueries: performanceMonitor.getSlowQueries(20),
        timestamp: new Date().toISOString()
      });
      
    case 'cache':
      return NextResponse.json({
        cache: cache.getStats(),
        timestamp: new Date().toISOString()
      });
      
    default:
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  }
}

// Export utilities
export {
  PerformanceMonitor,
  SimpleCache,
  QueryOptimizer,
  withPerformanceMonitoring,
  monitorDatabaseQuery,
  optimizeImageUrl,
  createLazyImageProps,
  shouldCompressResponse
}; 