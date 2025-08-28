// Intelligent Caching with Background Updates - Maximum Performance
import { EventEmitter } from 'events';

class IntelligentCacheManager extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map(); // Main cache storage
    this.cacheMetadata = new Map(); // Cache metadata (TTL, access patterns, etc.)
    this.backgroundJobs = new Map(); // Background update jobs
    this.cacheHits = new Map(); // Hit tracking for optimization
    this.userCachePrefs = new Map(); // User-specific cache preferences
    this.compressionCache = new Map(); // Compressed data cache
    
    // Cache configuration
    this.config = {
      maxSize: 1000000, // 1MB default max cache size
      defaultTTL: 300000, // 5 minutes default TTL
      backgroundRefreshThreshold: 0.8, // Refresh when 80% of TTL is reached
      maxCacheEntries: 10000,
      compressionThreshold: 1024, // Compress items larger than 1KB
      hitRatioTarget: 0.8, // Target 80% hit ratio
      categories: {
        // Different TTL and strategies for different data types
        user_profile: { ttl: 900000, priority: 'high', backgroundRefresh: true },
        messages: { ttl: 60000, priority: 'critical', backgroundRefresh: true },
        notifications: { ttl: 30000, priority: 'critical', backgroundRefresh: true },
        jobs: { ttl: 300000, priority: 'high', backgroundRefresh: true },
        job_details: { ttl: 180000, priority: 'high', backgroundRefresh: true },
        applications: { ttl: 120000, priority: 'high', backgroundRefresh: true },
        reviews: { ttl: 600000, priority: 'medium', backgroundRefresh: false },
        settings: { ttl: 1800000, priority: 'low', backgroundRefresh: false },
        static_data: { ttl: 3600000, priority: 'low', backgroundRefresh: false }
      }
    };

    this.startBackgroundTasks();
    console.log('🧠 Intelligent Cache Manager initialized');
  }

  // Set cache entry with intelligent metadata
  set(key, value, options = {}) {
    const now = Date.now();
    const category = this.getCategoryFromKey(key);
    const categoryConfig = this.config.categories[category] || {};
    
    const metadata = {
      key,
      category,
      size: this.calculateSize(value),
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      ttl: options.ttl || categoryConfig.ttl || this.config.defaultTTL,
      priority: options.priority || categoryConfig.priority || 'medium',
      backgroundRefresh: options.backgroundRefresh !== undefined 
        ? options.backgroundRefresh 
        : categoryConfig.backgroundRefresh || false,
      version: options.version || 1,
      compressed: false,
      userId: options.userId || null,
      tags: options.tags || [],
      dependencies: options.dependencies || [] // Keys that invalidate this cache
    };

    // Compress large items
    let finalValue = value;
    if (metadata.size > this.config.compressionThreshold) {
      try {
        finalValue = this.compressData(value);
        metadata.compressed = true;
        metadata.originalSize = metadata.size;
        metadata.size = this.calculateSize(finalValue);
        console.log(`🗜️ Compressed cache entry ${key}: ${metadata.originalSize} → ${metadata.size} bytes`);
      } catch (error) {
        console.warn(`⚠️ Compression failed for ${key}:`, error);
      }
    }

    // Check cache size limits
    if (this.shouldEvict()) {
      this.evictLeastUseful();
    }

    this.cache.set(key, finalValue);
    this.cacheMetadata.set(key, metadata);

    // Schedule background refresh if enabled
    if (metadata.backgroundRefresh) {
      this.scheduleBackgroundRefresh(key, metadata);
    }

    // Update statistics
    this.updateCacheStats('set', key, metadata);
    
    console.log(`💾 Cached ${key} (${metadata.size} bytes, TTL: ${metadata.ttl}ms)`);
    
    return true;
  }

  // Get cache entry with intelligent access tracking
  get(key, options = {}) {
    const now = Date.now();
    const value = this.cache.get(key);
    const metadata = this.cacheMetadata.get(key);

    if (!value || !metadata) {
      this.updateCacheStats('miss', key);
      return null;
    }

    // Check TTL
    if (now - metadata.createdAt > metadata.ttl) {
      this.delete(key);
      this.updateCacheStats('expired', key);
      return null;
    }

    // Update access metadata
    metadata.lastAccessed = now;
    metadata.accessCount++;
    this.cacheMetadata.set(key, metadata);

    // Decompress if needed
    let finalValue = value;
    if (metadata.compressed) {
      try {
        finalValue = this.decompressData(value);
      } catch (error) {
        console.error(`❌ Decompression failed for ${key}:`, error);
        this.delete(key);
        return null;
      }
    }

    // Check if background refresh is needed
    const age = now - metadata.createdAt;
    const refreshThreshold = metadata.ttl * this.config.backgroundRefreshThreshold;
    
    if (metadata.backgroundRefresh && age > refreshThreshold) {
      this.triggerBackgroundRefresh(key, metadata);
    }

    this.updateCacheStats('hit', key, metadata);
    
    return finalValue;
  }

  // Delete cache entry
  delete(key) {
    const metadata = this.cacheMetadata.get(key);
    
    this.cache.delete(key);
    this.cacheMetadata.delete(key);
    
    // Cancel background refresh if active
    if (this.backgroundJobs.has(key)) {
      clearTimeout(this.backgroundJobs.get(key));
      this.backgroundJobs.delete(key);
    }

    if (metadata) {
      this.updateCacheStats('delete', key, metadata);
      console.log(`🗑️ Deleted cache entry ${key}`);
    }

    return true;
  }

  // Invalidate cache entries by tags or patterns
  invalidate(options = {}) {
    const { tags, pattern, category, userId, dependencies } = options;
    let invalidatedCount = 0;

    for (const [key, metadata] of this.cacheMetadata.entries()) {
      let shouldInvalidate = false;

      // Check tags
      if (tags && metadata.tags.some(tag => tags.includes(tag))) {
        shouldInvalidate = true;
      }

      // Check pattern
      if (pattern && key.match(pattern)) {
        shouldInvalidate = true;
      }

      // Check category
      if (category && metadata.category === category) {
        shouldInvalidate = true;
      }

      // Check user ID
      if (userId && metadata.userId === userId) {
        shouldInvalidate = true;
      }

      // Check dependencies
      if (dependencies && metadata.dependencies.some(dep => dependencies.includes(dep))) {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        this.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`🧹 Invalidated ${invalidatedCount} cache entries`);
    return invalidatedCount;
  }

  // Smart prefetch based on usage patterns
  prefetch(keys, options = {}) {
    const { priority = 'low', userId = null } = options;
    
    keys.forEach(key => {
      // Skip if already cached and fresh
      const existing = this.get(key);
      if (existing) return;

      // Queue background fetch
      this.queueBackgroundFetch(key, { priority, userId });
    });
  }

  // Background refresh scheduling
  scheduleBackgroundRefresh(key, metadata) {
    // Cancel existing refresh if any
    if (this.backgroundJobs.has(key)) {
      clearTimeout(this.backgroundJobs.get(key));
    }

    const refreshTime = metadata.ttl * this.config.backgroundRefreshThreshold;
    
    const timeoutId = setTimeout(() => {
      this.performBackgroundRefresh(key, metadata);
    }, refreshTime);

    this.backgroundJobs.set(key, timeoutId);
  }

  // Trigger immediate background refresh
  triggerBackgroundRefresh(key, metadata) {
    if (this.backgroundJobs.has(key)) {
      return; // Already refreshing
    }

    // Mark as refreshing
    this.backgroundJobs.set(key, 'refreshing');
    
    // Perform refresh asynchronously
    setImmediate(() => {
      this.performBackgroundRefresh(key, metadata);
    });
  }

  // Perform background refresh
  async performBackgroundRefresh(key, metadata) {
    try {
      console.log(`🔄 Background refresh for ${key}`);
      
      // Determine refresh strategy based on key
      const refreshData = await this.fetchFreshData(key, metadata);
      
      if (refreshData) {
        // Update cache with fresh data, preserving metadata
        const newMetadata = {
          ...metadata,
          createdAt: Date.now(),
          version: metadata.version + 1
        };
        
        this.cache.set(key, refreshData);
        this.cacheMetadata.set(key, newMetadata);
        
        // Reschedule next refresh
        this.scheduleBackgroundRefresh(key, newMetadata);
        
        // Emit refresh event for interested listeners
        this.emit('cache:refreshed', {
          key,
          data: refreshData,
          version: newMetadata.version,
          timestamp: Date.now()
        });
        
        console.log(`✅ Background refreshed ${key} (v${newMetadata.version})`);
      }
      
    } catch (error) {
      console.error(`❌ Background refresh failed for ${key}:`, error);
      
      // Retry with exponential backoff
      const retryDelay = Math.min(30000, 1000 * Math.pow(2, metadata.refreshAttempts || 0));
      setTimeout(() => {
        metadata.refreshAttempts = (metadata.refreshAttempts || 0) + 1;
        this.performBackgroundRefresh(key, metadata);
      }, retryDelay);
      
    } finally {
      // Clear refreshing status
      this.backgroundJobs.delete(key);
    }
  }

  // Fetch fresh data for cache entry
  async fetchFreshData(key, metadata) {
    const category = metadata.category;
    const userId = metadata.userId;
    
    try {
      // Map cache keys to API endpoints
      let apiUrl;
      let fetchOptions = { method: 'GET' };

      switch (category) {
        case 'user_profile':
          const profileUserId = this.extractUserIdFromKey(key);
          apiUrl = `/api/user/profile/${profileUserId}`;
          break;
          
        case 'messages':
          const conversationId = this.extractIdFromKey(key, 'messages');
          apiUrl = `/api/messages?conversationId=${conversationId}`;
          break;
          
        case 'notifications':
          apiUrl = `/api/user/notifications`;
          break;
          
        case 'jobs':
          apiUrl = `/api/jobs`;
          break;
          
        case 'job_details':
          const jobId = this.extractIdFromKey(key, 'job');
          apiUrl = `/api/jobs/${jobId}`;
          break;
          
        case 'applications':
          apiUrl = `/api/jobs/applications`;
          break;
          
        case 'reviews':
          apiUrl = `/api/reviews`;
          break;
          
        default:
          console.warn(`Unknown cache category for refresh: ${category}`);
          return null;
      }

      const response = await fetch(apiUrl, {
        ...fetchOptions,
        headers: {
          'X-Cache-Refresh': 'background',
          'X-Cache-Version': metadata.version.toString(),
          ...fetchOptions.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
      
    } catch (error) {
      console.error(`❌ Fresh data fetch error for ${key}:`, error);
      return null;
    }
  }

  // Cache eviction logic
  shouldEvict() {
    return (
      this.cache.size > this.config.maxCacheEntries ||
      this.getCurrentCacheSize() > this.config.maxSize
    );
  }

  evictLeastUseful() {
    const candidates = Array.from(this.cacheMetadata.entries())
      .map(([key, metadata]) => ({
        key,
        ...metadata,
        score: this.calculateEvictionScore(metadata)
      }))
      .sort((a, b) => a.score - b.score); // Lower score = more likely to evict

    // Evict bottom 10% or at least 1 entry
    const evictCount = Math.max(1, Math.floor(candidates.length * 0.1));
    const toEvict = candidates.slice(0, evictCount);

    toEvict.forEach(({ key }) => {
      this.delete(key);
    });

    console.log(`🧹 Evicted ${evictCount} cache entries`);
  }

  calculateEvictionScore(metadata) {
    const now = Date.now();
    const age = now - metadata.createdAt;
    const timeSinceAccess = now - metadata.lastAccessed;
    
    // Higher score = less likely to evict
    let score = 0;

    // Priority multiplier
    const priorityMultiplier = {
      critical: 100,
      high: 50,
      medium: 20,
      low: 10
    }[metadata.priority] || 10;

    // Access frequency bonus
    const accessFrequency = metadata.accessCount / Math.max(1, age / 3600000); // per hour
    
    // Recency bonus
    const recencyBonus = Math.max(0, 3600000 - timeSinceAccess) / 3600000; // Higher for recent access

    score = (priorityMultiplier * accessFrequency * (1 + recencyBonus)) - (metadata.size / 1024);
    
    return score;
  }

  // Compression utilities
  compressData(data) {
    // Simple compression simulation - in production, use proper compression
    const jsonString = JSON.stringify(data);
    
    // Base64 encode as compression simulation
    return btoa(jsonString);
  }

  decompressData(compressedData) {
    // Simple decompression simulation
    const jsonString = atob(compressedData);
    return JSON.parse(jsonString);
  }

  // Utility functions
  getCategoryFromKey(key) {
    const parts = key.split(':');
    return parts[0] || 'unknown';
  }

  extractUserIdFromKey(key) {
    const match = key.match(/user:(\w+)/);
    return match ? match[1] : null;
  }

  extractIdFromKey(key, prefix) {
    const match = key.match(new RegExp(`${prefix}:([^:]+)`));
    return match ? match[1] : null;
  }

  calculateSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }

  getCurrentCacheSize() {
    let totalSize = 0;
    for (const metadata of this.cacheMetadata.values()) {
      totalSize += metadata.size;
    }
    return totalSize;
  }

  // Statistics and monitoring
  updateCacheStats(operation, key, metadata = null) {
    if (!this.cacheHits.has(operation)) {
      this.cacheHits.set(operation, new Map());
    }
    
    const operationStats = this.cacheHits.get(operation);
    const category = metadata?.category || this.getCategoryFromKey(key);
    
    operationStats.set(category, (operationStats.get(category) || 0) + 1);
  }

  getCacheStats() {
    const totalEntries = this.cache.size;
    const totalSize = this.getCurrentCacheSize();
    
    const hits = Array.from(this.cacheHits.get('hit')?.values() || []).reduce((a, b) => a + b, 0);
    const misses = Array.from(this.cacheHits.get('miss')?.values() || []).reduce((a, b) => a + b, 0);
    const hitRatio = hits + misses > 0 ? hits / (hits + misses) : 0;

    return {
      totalEntries,
      totalSize,
      maxSize: this.config.maxSize,
      hits,
      misses,
      hitRatio: Math.round(hitRatio * 100) / 100,
      backgroundJobs: this.backgroundJobs.size,
      categories: this.getCategoryStats(),
      timestamp: Date.now()
    };
  }

  getCategoryStats() {
    const stats = {};
    
    for (const metadata of this.cacheMetadata.values()) {
      const category = metadata.category;
      if (!stats[category]) {
        stats[category] = {
          count: 0,
          totalSize: 0,
          avgAccess: 0,
          totalAccess: 0
        };
      }
      
      stats[category].count++;
      stats[category].totalSize += metadata.size;
      stats[category].totalAccess += metadata.accessCount;
    }

    // Calculate averages
    Object.values(stats).forEach(stat => {
      stat.avgAccess = stat.count > 0 ? Math.round(stat.totalAccess / stat.count) : 0;
    });

    return stats;
  }

  // Background tasks
  startBackgroundTasks() {
    // Periodic cleanup every 5 minutes
    setInterval(() => {
      this.performMaintenance();
    }, 5 * 60 * 1000);

    // Statistics logging every minute
    setInterval(() => {
      const stats = this.getCacheStats();
      console.log(`📊 Cache Stats:`, {
        entries: stats.totalEntries,
        size: `${Math.round(stats.totalSize / 1024)}KB`,
        hitRatio: `${(stats.hitRatio * 100).toFixed(1)}%`,
        backgroundJobs: stats.backgroundJobs
      });
    }, 60 * 1000);

    // Optimization every 10 minutes
    setInterval(() => {
      this.optimizeCache();
    }, 10 * 60 * 1000);

    console.log('⏰ Background cache tasks started');
  }

  performMaintenance() {
    const now = Date.now();
    let expiredCount = 0;
    let cleanedJobs = 0;

    // Remove expired entries
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (now - metadata.createdAt > metadata.ttl) {
        this.delete(key);
        expiredCount++;
      }
    }

    // Clean up completed background jobs
    for (const [key, jobId] of this.backgroundJobs.entries()) {
      if (typeof jobId === 'number') {
        // Check if the timeout is still valid
        if (!this.cacheMetadata.has(key)) {
          clearTimeout(jobId);
          this.backgroundJobs.delete(key);
          cleanedJobs++;
        }
      }
    }

    if (expiredCount > 0 || cleanedJobs > 0) {
      console.log(`🧹 Cache maintenance: ${expiredCount} expired, ${cleanedJobs} jobs cleaned`);
    }
  }

  optimizeCache() {
    const stats = this.getCacheStats();
    
    // If hit ratio is below target, adjust cache strategy
    if (stats.hitRatio < this.config.hitRatioTarget) {
      console.log(`📈 Cache hit ratio (${(stats.hitRatio * 100).toFixed(1)}%) below target, optimizing...`);
      
      // Increase TTL for frequently accessed items
      for (const [key, metadata] of this.cacheMetadata.entries()) {
        if (metadata.accessCount > 10) {
          metadata.ttl = Math.min(metadata.ttl * 1.2, 3600000); // Max 1 hour
          this.cacheMetadata.set(key, metadata);
        }
      }
    }

    // If cache is too full, be more aggressive with eviction
    if (stats.totalEntries > this.config.maxCacheEntries * 0.9) {
      this.evictLeastUseful();
    }

    console.log('🔧 Cache optimization completed');
  }

  // Queue background fetch
  queueBackgroundFetch(key, options = {}) {
    if (this.backgroundJobs.has(key)) {
      return; // Already queued/processing
    }

    const delay = options.priority === 'high' ? 0 : 1000; // High priority = immediate
    
    const timeoutId = setTimeout(async () => {
      const metadata = this.cacheMetadata.get(key) || {
        category: this.getCategoryFromKey(key),
        userId: options.userId,
        version: 1,
        refreshAttempts: 0
      };
      
      await this.performBackgroundRefresh(key, metadata);
    }, delay);

    this.backgroundJobs.set(key, timeoutId);
  }

  // User-specific cache management
  setUserPreferences(userId, preferences) {
    this.userCachePrefs.set(userId, {
      enableCache: true,
      preferredCategories: ['messages', 'notifications', 'jobs'],
      maxSize: 50 * 1024, // 50KB per user
      ...preferences
    });
  }

  getUserCacheEntries(userId) {
    const entries = [];
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (metadata.userId === userId) {
        entries.push({
          key,
          ...metadata,
          hasValue: this.cache.has(key)
        });
      }
    }
    return entries;
  }

  clearUserCache(userId) {
    const cleared = this.invalidate({ userId });
    console.log(`🧹 Cleared ${cleared} cache entries for user ${userId}`);
    return cleared;
  }
}

// Singleton instance
const intelligentCacheManager = new IntelligentCacheManager();

export default intelligentCacheManager;