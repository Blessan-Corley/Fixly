// lib/redis.js - Upstash Redis REST client (serverless-compatible for Vercel)
// Using @upstash/redis REST API - no persistent connections, perfect for serverless
import { Redis } from '@upstash/redis';

let redis = null;
let isHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 60000; // Check health every minute

/**
 * Initialize Upstash Redis REST client
 * REST API is stateless and serverless-compatible
 */
export const initRedis = () => {
  if (!redis) {
    try {
      // Validate environment variables
      const restUrl = process.env.UPSTASH_REDIS_REST_URL;
      const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!restUrl || !restToken) {
        console.error('❌ [Redis] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
        console.error('Redis features will be disabled');
        isHealthy = false;
        return null;
      }

      // Initialize Upstash Redis REST client
      redis = new Redis({
        url: restUrl,
        token: restToken,
        // Automatic retry with exponential backoff
        retry: {
          retries: 3,
          backoff: (retryCount) => Math.min(retryCount * 50, 500)
        },
        // Request timeout
        timeout: 5000 // 5 seconds
      });

      console.log('✅ [Redis] Upstash Redis REST client initialized');
      isHealthy = true;
    } catch (error) {
      console.error('❌ [Redis] Failed to initialize Redis client:', error);
      redis = null;
      isHealthy = false;
    }
  }

  return redis;
};

/**
 * Get Redis client instance
 */
export const getRedis = () => {
  if (!redis) {
    return initRedis();
  }
  return redis;
};

/**
 * Check Redis health (cached for 1 minute)
 */
export const checkRedisHealth = async () => {
  const now = Date.now();

  // Return cached health status if checked recently
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return isHealthy;
  }

  try {
    const client = getRedis();
    if (!client) {
      isHealthy = false;
      return false;
    }

    // Simple ping test
    const result = await client.ping();
    isHealthy = result === 'PONG';
    lastHealthCheck = now;

    if (isHealthy) {
      console.log('✅ [Redis] Health check passed');
    } else {
      console.warn('⚠️ [Redis] Health check failed: unexpected response');
    }

    return isHealthy;
  } catch (error) {
    console.error('❌ [Redis] Health check failed:', error.message);
    isHealthy = false;
    lastHealthCheck = now;
    return false;
  }
};

// In-memory fallback for rate limiting when Redis is down
const memoryRateLimit = new Map();

/**
 * Rate limiting using Redis (with fallback)
 */
export async function redisRateLimit(key, maxRequests, windowSeconds, namespace = 'rate_limit') {
  try {
    const client = getRedis();
    if (!client) {
      throw new Error('Redis client not available');
    }

    const redisKey = `${namespace}:${key}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Get current count
    const count = await client.incr(redisKey);

    // Set expiry on first request
    if (count === 1) {
      await client.expire(redisKey, windowSeconds);
    }

    const ttl = await client.ttl(redisKey);
    const resetTime = now + (ttl * 1000);

    if (count > maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime,
        retryAfter: ttl
      };
    }

    return {
      success: true,
      remaining: Math.max(0, maxRequests - count),
      resetTime,
      fallback: false
    };
  } catch (error) {
    console.error('❌ [Redis] Rate limit error, using in-memory fallback:', error.message);
    
    // In-memory fallback logic
    const now = Date.now();
    const fallbackKey = `${namespace}:${key}`;
    const record = memoryRateLimit.get(fallbackKey) || { count: 0, resetTime: now + (windowSeconds * 1000) };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + (windowSeconds * 1000);
    }

    record.count++;
    memoryRateLimit.set(fallbackKey, record);

    // Clean up old entries occasionally (simple garbage collection)
    if (memoryRateLimit.size > 10000) {
      memoryRateLimit.clear();
    }

    if (record.count > maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
        fallback: true
      };
    }

    return {
      success: true,
      remaining: Math.max(0, maxRequests - record.count),
      resetTime: record.resetTime,
      fallback: true
    };
  }
}

/**
 * Cache utilities
 */
export const redisUtils = {
  /**
   * Get cached value
   */
  async get(key) {
    try {
      const client = getRedis();
      if (!client) return null;

      const value = await client.get(key);
      return value;
    } catch (error) {
      console.error(`❌ [Redis] Get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set cached value with optional TTL
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const client = getRedis();
      if (!client) {
        console.warn(`⚠️ [Redis] Client not available for set operation on key: ${key}`);
        return false;
      }

      // Upstash Redis REST API can handle JSON directly
      // No need to stringify - the REST client handles it
      const valueToStore = value;

      // Use set with EX option for TTL (Upstash Redis REST API format)
      if (ttlSeconds && ttlSeconds > 0) {
        await client.set(key, valueToStore, { ex: ttlSeconds });
      } else {
        await client.set(key, valueToStore);
      }

      console.log(`✅ [Redis] Set key: ${key} (TTL: ${ttlSeconds}s)`);
      return true;
    } catch (error) {
      console.error(`❌ [Redis] Set error for key ${key}:`, error);
      console.error(`   Value type: ${typeof value}, TTL: ${ttlSeconds}`);
      console.error(`   Error details:`, error.message);
      return false;
    }
  },

  /**
   * Set cached value with TTL (alias for compatibility)
   */
  async setex(key, ttlSeconds, value) {
    // Note: parameter order is different from standard Redis setex
    // This method maintains backward compatibility
    return this.set(key, value, ttlSeconds);
  },

  /**
   * Delete cached value
   */
  async del(key) {
    try {
      const client = getRedis();
      if (!client) return false;

      await client.del(key);
      return true;
    } catch (error) {
      console.error(`❌ [Redis] Delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const client = getRedis();
      if (!client) return false;

      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ [Redis] Exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Get multiple keys matching pattern (use with caution - expensive operation)
   */
  async keys(pattern) {
    try {
      const client = getRedis();
      if (!client) return [];

      const keys = await client.keys(pattern);
      return keys || [];
    } catch (error) {
      console.error(`❌ [Redis] Keys error for pattern ${pattern}:`, error);
      return [];
    }
  },

  /**
   * Invalidate cache by pattern (use SCAN for production)
   */
  async invalidatePattern(pattern) {
    try {
      const client = getRedis();
      if (!client) return false;

      // Get all keys matching pattern
      const keys = await client.keys(pattern);

      if (keys && keys.length > 0) {
        // Delete in batches to avoid overwhelming Redis
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await client.del(...batch);
        }
        console.log(`✅ [Redis] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ [Redis] Invalidate pattern error for ${pattern}:`, error);
      return false;
    }
  },

  /**
   * Get TTL for a key
   */
  async ttl(key) {
    try {
      const client = getRedis();
      if (!client) return -1;

      const ttl = await client.ttl(key);
      return ttl;
    } catch (error) {
      console.error(`❌ [Redis] TTL error for key ${key}:`, error);
      return -1;
    }
  },

  /**
   * Increment counter
   */
  async incr(key) {
    try {
      const client = getRedis();
      if (!client) return 0;

      const value = await client.incr(key);
      return value;
    } catch (error) {
      console.error(`❌ [Redis] Increment error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Decrement counter
   */
  async decr(key) {
    try {
      const client = getRedis();
      if (!client) return 0;

      const value = await client.decr(key);
      return value;
    } catch (error) {
      console.error(`❌ [Redis] Decrement error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Set expiry on existing key
   */
  async expire(key, seconds) {
    try {
      const client = getRedis();
      if (!client) return false;

      await client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`❌ [Redis] Expire error for key ${key}:`, error);
      return false;
    }
  }
};

// Export for backward compatibility
export default {
  initRedis,
  getRedis,
  checkRedisHealth,
  redisRateLimit,
  redisUtils
};
