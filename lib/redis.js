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

/**
 * Rate limiting using Redis (with fallback)
 */
export async function redisRateLimit(key, maxRequests, windowSeconds, namespace = 'rate_limit') {
  try {
    const client = getRedis();
    if (!client) {
      return { success: true, fallback: true };
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
    console.error('❌ [Redis] Rate limit error:', error);
    // Fail open - allow request if Redis fails
    return { success: true, fallback: true };
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
      if (!client) return false;

      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }

      return true;
    } catch (error) {
      console.error(`❌ [Redis] Set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Set cached value with TTL (alias for compatibility)
   */
  async setex(key, ttlSeconds, value) {
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
