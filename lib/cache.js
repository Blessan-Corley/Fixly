// Simple in-memory cache replacement for Redis
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timeouts = new Map();
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires && Date.now() > item.expires) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key, value, ttl = 300) { // 5 minutes default
    // Clear existing timeout
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    const expires = ttl > 0 ? Date.now() + (ttl * 1000) : null;
    this.cache.set(key, { value, expires });

    // Set auto-cleanup
    if (expires) {
      const timeout = setTimeout(() => {
        this.delete(key);
      }, ttl * 1000);
      this.timeouts.set(key, timeout);
    }

    return 'OK';
  }

  async delete(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
    return this.cache.delete(key);
  }

  async exists(key) {
    return this.cache.has(key) && !(await this.get(key) === null);
  }

  async keys(pattern = '*') {
    if (pattern === '*') {
      return Array.from(this.cache.keys());
    }
    // Simple pattern matching (only supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async flushall() {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.cache.clear();
    this.timeouts.clear();
    return 'OK';
  }

  size() {
    return this.cache.size;
  }
}

// Redis health check function for rate limiting compatibility
export async function redisHealthCheck() {
  // Always return healthy since we're using in-memory cache
  return { 
    status: 'healthy',
    connected: true,
    cache_type: 'in-memory'
  };
}

// Simple analytics mock
class SimpleAnalytics {
  async trackEvent(event, data = {}) {
    console.log('📊 Analytics:', event, data);
    return true;
  }

  async getStats() {
    return {
      events: 0,
      users: 0,
      sessions: 0
    };
  }
}

// Export instances
const cache = new SimpleCache();
const analytics = new SimpleAnalytics();

// Additional export functions for compatibility
export function getRedisClient() {
  return cache;
}

export async function redisRateLimit(key, limit, windowSeconds, namespace = 'rate_limit') {
  try {
    const fullKey = `${namespace}:${key}`;
    const current = await cache.get(fullKey);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetTime: Date.now() + (windowSeconds * 1000),
        retryAfter: windowSeconds / 60, // in minutes
        fallback: false
      };
    }
    
    await cache.set(fullKey, count + 1, windowSeconds);
    
    return {
      success: true,
      remaining: limit - count - 1,
      resetTime: Date.now() + (windowSeconds * 1000),
      retryAfter: null,
      fallback: false
    };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return {
      success: true,
      remaining: limit,
      resetTime: Date.now() + (windowSeconds * 1000),
      retryAfter: null,
      fallback: true
    };
  }
}

export { cache, analytics };