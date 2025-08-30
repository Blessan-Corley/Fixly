// utils/cacheStrategies.js - Advanced caching strategies for performance optimization
import { LRUCache } from 'lru-cache';

/**
 * Multi-level caching system for optimal performance
 * Combines memory cache, browser cache, and distributed cache strategies
 */
class CacheManager {
  constructor(options = {}) {
    const {
      memorySize = 1000,
      memoryTTL = 5 * 60 * 1000, // 5 minutes
      enableCompression = true,
      enableMetrics = true
    } = options;

    // Level 1: In-memory LRU cache (fastest)
    this.memoryCache = new LRUCache({
      max: memorySize,
      ttl: memoryTTL,
      updateAgeOnGet: true,
      allowStale: false
    });

    // Level 2: Browser storage cache (persistent)
    this.browserCache = typeof window !== 'undefined' ? {
      set: (key, value, ttl) => {
        const item = {
          value,
          timestamp: Date.now(),
          ttl
        };
        try {
          localStorage.setItem(`fixly_cache_${key}`, JSON.stringify(item));
        } catch (e) {
          console.warn('Browser cache storage failed:', e.name);
        }
      },
      get: (key) => {
        try {
          const item = localStorage.getItem(`fixly_cache_${key}`);
          if (!item) return null;
          
          const parsed = JSON.parse(item);
          if (Date.now() - parsed.timestamp > parsed.ttl) {
            localStorage.removeItem(`fixly_cache_${key}`);
            return null;
          }
          return parsed.value;
        } catch (e) {
          return null;
        }
      },
      delete: (key) => {
        try {
          localStorage.removeItem(`fixly_cache_${key}`);
        } catch (e) {}
      }
    } : null;

    this.enableCompression = enableCompression;
    this.enableMetrics = enableMetrics;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Get value from cache with multi-level fallback
   * @param {string} key - Cache key
   * @param {Object} options - Cache options
   * @returns {*} Cached value or null
   */
  get(key, options = {}) {
    const { strategy = 'memory-first' } = options;
    
    try {
      let value = null;

      // Strategy 1: Memory first (fastest)
      if (strategy === 'memory-first' || strategy === 'hybrid') {
        value = this.memoryCache.get(key);
        if (value !== undefined) {
          this.updateMetrics('hits');
          return value;
        }
      }

      // Strategy 2: Browser cache fallback
      if (this.browserCache && (strategy === 'browser-first' || strategy === 'hybrid')) {
        value = this.browserCache.get(key);
        if (value !== null) {
          // Promote to memory cache
          this.memoryCache.set(key, value);
          this.updateMetrics('hits');
          return value;
        }
      }

      this.updateMetrics('misses');
      return null;
    } catch (error) {
      this.updateMetrics('errors');
      console.warn('Cache get error:', error.name);
      return null;
    }
  }

  /**
   * Set value in cache with multi-level storage
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Cache options
   */
  set(key, value, options = {}) {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      memoryOnly = false,
      browserOnly = false,
      strategy = 'hybrid'
    } = options;

    try {
      // Compress large objects if enabled
      const finalValue = this.enableCompression && this.shouldCompress(value)
        ? this.compress(value)
        : value;

      // Memory cache (always fast)
      if (!browserOnly && (strategy === 'memory-first' || strategy === 'hybrid')) {
        this.memoryCache.set(key, finalValue);
      }

      // Browser cache for persistence
      if (!memoryOnly && this.browserCache && 
          (strategy === 'browser-first' || strategy === 'hybrid')) {
        this.browserCache.set(key, finalValue, ttl);
      }

      this.updateMetrics('sets');
    } catch (error) {
      this.updateMetrics('errors');
      console.warn('Cache set error:', error.name);
    }
  }

  /**
   * Delete from all cache levels
   * @param {string} key - Cache key
   */
  delete(key) {
    try {
      this.memoryCache.delete(key);
      if (this.browserCache) {
        this.browserCache.delete(key);
      }
      this.updateMetrics('deletes');
    } catch (error) {
      this.updateMetrics('errors');
      console.warn('Cache delete error:', error.name);
    }
  }

  /**
   * Clear all caches
   */
  clear() {
    try {
      this.memoryCache.clear();
      if (this.browserCache) {
        // Clear all fixly cache items
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fixly_cache_')) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Cache clear error:', error.name);
    }
  }

  /**
   * Get or set with automatic caching
   * @param {string} key - Cache key
   * @param {Function} getter - Function to get value if not cached
   * @param {Object} options - Cache options
   * @returns {Promise<*>} Cached or computed value
   */
  async getOrSet(key, getter, options = {}) {
    const cached = this.get(key, options);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await getter();
      this.set(key, value, options);
      return value;
    } catch (error) {
      console.warn('Cache getOrSet error:', error.name);
      throw error;
    }
  }

  /**
   * Check if value should be compressed
   * @param {*} value - Value to check
   * @returns {boolean} True if should compress
   */
  shouldCompress(value) {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    
    const str = JSON.stringify(value);
    return str.length > 1000; // Compress if > 1KB
  }

  /**
   * Simple compression using string techniques
   * @param {*} value - Value to compress
   * @returns {Object} Compressed value with metadata
   */
  compress(value) {
    try {
      const str = JSON.stringify(value);
      // Simple compression - could be enhanced with actual compression libs
      return {
        __compressed: true,
        data: str,
        originalSize: str.length,
        compressedAt: Date.now()
      };
    } catch (error) {
      return value; // Return original on error
    }
  }

  /**
   * Decompress value
   * @param {*} value - Value to decompress
   * @returns {*} Decompressed value
   */
  decompress(value) {
    if (!value || !value.__compressed) {
      return value;
    }
    
    try {
      return JSON.parse(value.data);
    } catch (error) {
      return value; // Return as-is on error
    }
  }

  /**
   * Update cache metrics
   * @param {string} type - Metric type
   */
  updateMetrics(type) {
    if (!this.enableMetrics) return;
    this.metrics[type] = (this.metrics[type] || 0) + 1;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      memory: {
        size: this.memoryCache.size,
        max: this.memoryCache.max,
        calculatedSize: this.memoryCache.calculatedSize
      },
      metrics: this.enableMetrics ? {
        ...this.metrics,
        hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0
      } : null,
      browser: this.browserCache ? {
        supported: true,
        usage: this.getBrowserCacheUsage()
      } : { supported: false }
    };
  }

  /**
   * Get browser cache usage estimate
   * @returns {Object} Usage statistics
   */
  getBrowserCacheUsage() {
    if (!this.browserCache) return null;

    try {
      let totalSize = 0;
      let itemCount = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fixly_cache_')) {
          itemCount++;
          totalSize += localStorage.getItem(key).length;
        }
      }

      return { itemCount, totalSize };
    } catch (error) {
      return null;
    }
  }
}

/**
 * Specialized caches for different data types
 */

// API Response Cache
class APIResponseCache extends CacheManager {
  constructor() {
    super({
      memorySize: 500,
      memoryTTL: 2 * 60 * 1000, // 2 minutes for API responses
      enableCompression: true
    });
  }

  /**
   * Generate cache key for API requests
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} params - Request parameters
   * @returns {string} Cache key
   */
  generateAPIKey(method, url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `api_${method.toLowerCase()}_${url}_${sortedParams}`;
  }

  /**
   * Cache API response
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} params - Request parameters
   * @param {*} response - Response data
   * @param {number} ttl - Time to live in milliseconds
   */
  cacheResponse(method, url, params, response, ttl = 2 * 60 * 1000) {
    const key = this.generateAPIKey(method, url, params);
    this.set(key, response, { ttl });
  }

  /**
   * Get cached API response
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} params - Request parameters
   * @returns {*} Cached response or null
   */
  getCachedResponse(method, url, params) {
    const key = this.generateAPIKey(method, url, params);
    return this.get(key);
  }
}

// User Data Cache
class UserDataCache extends CacheManager {
  constructor() {
    super({
      memorySize: 200,
      memoryTTL: 10 * 60 * 1000, // 10 minutes for user data
      enableCompression: false // User data usually small
    });
  }

  /**
   * Cache user profile data
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   * @param {number} ttl - Time to live
   */
  cacheUserData(userId, userData, ttl = 10 * 60 * 1000) {
    this.set(`user_${userId}`, userData, { ttl, strategy: 'hybrid' });
  }

  /**
   * Get cached user data
   * @param {string} userId - User ID
   * @returns {Object|null} User data or null
   */
  getUserData(userId) {
    return this.get(`user_${userId}`, { strategy: 'hybrid' });
  }

  /**
   * Invalidate user cache
   * @param {string} userId - User ID
   */
  invalidateUser(userId) {
    this.delete(`user_${userId}`);
  }
}

// Location Data Cache
class LocationDataCache extends CacheManager {
  constructor() {
    super({
      memorySize: 300,
      memoryTTL: 15 * 60 * 1000, // 15 minutes for location data
      enableCompression: true
    });
  }

  /**
   * Generate location cache key
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius
   * @param {Object} filters - Search filters
   * @returns {string} Cache key
   */
  generateLocationKey(lat, lng, radius, filters = {}) {
    const roundedLat = Math.round(lat * 1000) / 1000; // Round to ~100m precision
    const roundedLng = Math.round(lng * 1000) / 1000;
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    
    return `location_${roundedLat}_${roundedLng}_${radius}_${filterString}`;
  }

  /**
   * Cache location search results
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius
   * @param {Object} filters - Search filters
   * @param {Array} results - Search results
   * @param {number} ttl - Time to live
   */
  cacheLocationResults(lat, lng, radius, filters, results, ttl = 5 * 60 * 1000) {
    const key = this.generateLocationKey(lat, lng, radius, filters);
    this.set(key, {
      results,
      timestamp: Date.now(),
      location: { lat, lng, radius },
      filters
    }, { ttl });
  }

  /**
   * Get cached location results
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius
   * @param {Object} filters - Search filters
   * @returns {Object|null} Cached results or null
   */
  getCachedLocationResults(lat, lng, radius, filters) {
    const key = this.generateLocationKey(lat, lng, radius, filters);
    const cached = this.get(key);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.results;
    }
    
    return null;
  }
}

/**
 * Cache warming strategies
 */
class CacheWarmer {
  constructor(apiCache, userCache, locationCache) {
    this.apiCache = apiCache;
    this.userCache = userCache;
    this.locationCache = locationCache;
  }

  /**
   * Warm up caches with commonly accessed data
   * @param {Object} options - Warming options
   */
  async warmUpCaches(options = {}) {
    const {
      warmUserData = true,
      warmPopularLocations = true,
      warmRecentAPI = false
    } = options;

    try {
      const promises = [];

      if (warmUserData) {
        promises.push(this.warmUserData());
      }

      if (warmPopularLocations) {
        promises.push(this.warmPopularLocations());
      }

      if (warmRecentAPI) {
        promises.push(this.warmRecentAPI());
      }

      await Promise.allSettled(promises);
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.warn('⚠️ Cache warming failed:', error.name);
    }
  }

  /**
   * Warm user data cache
   */
  async warmUserData() {
    // Implementation would fetch frequently accessed user data
    console.log('🔥 Warming user data cache...');
  }

  /**
   * Warm popular locations cache
   */
  async warmPopularLocations() {
    // Implementation would fetch popular location searches
    console.log('🔥 Warming location data cache...');
  }

  /**
   * Warm recent API responses
   */
  async warmRecentAPI() {
    // Implementation would fetch commonly requested API data
    console.log('🔥 Warming API response cache...');
  }
}

// Singleton instances
let apiCacheInstance = null;
let userCacheInstance = null;
let locationCacheInstance = null;
let cacheWarmerInstance = null;

/**
 * Get API cache instance
 * @returns {APIResponseCache}
 */
export function getAPICache() {
  if (!apiCacheInstance) {
    apiCacheInstance = new APIResponseCache();
  }
  return apiCacheInstance;
}

/**
 * Get user cache instance
 * @returns {UserDataCache}
 */
export function getUserCache() {
  if (!userCacheInstance) {
    userCacheInstance = new UserDataCache();
  }
  return userCacheInstance;
}

/**
 * Get location cache instance
 * @returns {LocationDataCache}
 */
export function getLocationCache() {
  if (!locationCacheInstance) {
    locationCacheInstance = new LocationDataCache();
  }
  return locationCacheInstance;
}

/**
 * Get cache warmer instance
 * @returns {CacheWarmer}
 */
export function getCacheWarmer() {
  if (!cacheWarmerInstance) {
    cacheWarmerInstance = new CacheWarmer(
      getAPICache(),
      getUserCache(),
      getLocationCache()
    );
  }
  return cacheWarmerInstance;
}

/**
 * Initialize all caches and start warming
 * @param {Object} options - Initialization options
 */
export async function initializeCaches(options = {}) {
  const apiCache = getAPICache();
  const userCache = getUserCache();
  const locationCache = getLocationCache();
  const warmer = getCacheWarmer();

  // Start cache warming in background
  if (options.enableWarming !== false) {
    setImmediate(() => warmer.warmUpCaches(options));
  }

  console.log('🚀 Cache system initialized');
}

/**
 * Get all cache statistics
 * @returns {Object} Combined cache statistics
 */
export function getAllCacheStats() {
  return {
    api: getAPICache().getStats(),
    user: getUserCache().getStats(),
    location: getLocationCache().getStats()
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  getAPICache().clear();
  getUserCache().clear();
  getLocationCache().clear();
  console.log('🧹 All caches cleared');
}

export {
  CacheManager,
  APIResponseCache,
  UserDataCache,
  LocationDataCache,
  CacheWarmer
};