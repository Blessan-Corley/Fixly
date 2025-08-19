// lib/redis.js - Redis client configuration and utilities
import { createClient } from 'redis';

let redis = null;
let redisAvailable = false;

// Initialize Redis client
export async function getRedisClient() {
  // Skip Redis during build time or when explicitly disabled
  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    // Client-side or Vercel build - don't connect to Redis
    return null;
  }

  // Skip during Next.js build process
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    return null;
  }

  if (!redis && !redisAvailable) {
    try {
      // Check if Redis is disabled or not configured
      if (!process.env.REDIS_URL) {
        // Only log during development
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Redis URL not configured, running without Redis features');
        }
        return null;
      }

      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Use the same stable configuration as Socket.io adapter
      const redisConfig = {
        url: redisUrl,
        socket: {
          tls: true,
          rejectUnauthorized: false,
          connectTimeout: 30000,
          commandTimeout: 5000,
          lazyConnect: false,
          keepAlive: true,
          family: 0 // Let system choose IPv4 or IPv6
        },
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false
      };
      
      redis = createClient(redisConfig);

      redis.on('error', (err) => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
          console.warn('⚠️ Redis not available, running without Redis features');
          redisAvailable = false;
          redis = null;
        } else {
          console.error('❌ Redis Client Error:', err);
        }
      });

      redis.on('connect', () => {
        console.log('🔗 Redis connecting...');
      });

      redis.on('ready', () => {
        console.log('✅ Redis client ready');
        redisAvailable = true;
      });

      redis.on('end', () => {
        console.log('🔌 Redis connection ended');
        redisAvailable = false;
      });

      await redis.connect();
      redisAvailable = true;
    } catch (error) {
      console.warn('⚠️ Redis connection failed, continuing without Redis:', error.message);
      redis = null;
      redisAvailable = false;
      // Don't throw error, just return null
      return null;
    }
  }

  return redis;
}

// Enhanced rate limiting with Redis
export async function redisRateLimit(identifier, limit = 100, window = 3600, prefix = 'rate_limit') {
  try {
    const client = await getRedisClient();
    
    // If Redis is not available, allow the request
    if (!client) {
      return {
        success: true,
        count: 0,
        remaining: limit,
        resetTime: Date.now() + (window * 1000),
        retryAfter: null,
        fallback: true
      };
    }

    const key = `${prefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - (window * 1000);

    // Use Redis pipeline for atomic operations
    const pipeline = client.multi();
    
    // Remove expired entries
    pipeline.zRemRangeByScore(key, 0, windowStart);
    
    // Add current request
    pipeline.zAdd(key, { score: now, value: now.toString() });
    
    // Count requests in current window
    pipeline.zCard(key);
    
    // Set expiration
    pipeline.expire(key, window);
    
    const results = await pipeline.exec();
    const requestCount = results[2];

    const remaining = Math.max(0, limit - requestCount);
    const resetTime = now + (window * 1000);

    return {
      success: requestCount <= limit,
      count: requestCount,
      remaining,
      resetTime,
      retryAfter: requestCount > limit ? Math.ceil(window / 60) : null
    };
  } catch (error) {
    // Fallback to allow request if Redis is down
    return {
      success: true,
      count: 0,
      remaining: limit,
      resetTime: Date.now() + (window * 1000),
      retryAfter: null,
      fallback: true
    };
  }
}

// Caching utilities
export class RedisCache {
  constructor(defaultTTL = 3600) {
    this.defaultTTL = defaultTTL;
  }

  async get(key) {
    try {
      const client = await getRedisClient();
      if (!client) return null;
      const data = await client.get(`cache:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.setEx(`cache:${key}`, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  async del(key) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.del(`cache:${key}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async exists(key) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      return await client.exists(`cache:${key}`);
    } catch (error) {
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      const keys = await client.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get or set pattern for expensive operations
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    try {
      let data = await this.get(key);
      
      if (data === null) {
        data = await fetchFn();
        await this.set(key, data, ttl);
      }
      
      return data;
    } catch (error) {
      // Fallback to direct fetch
      return await fetchFn();
    }
  }

  // Increment counter methods for analytics
  async incrementCounter(key, increment = 1) {
    try {
      const client = await getRedisClient();
      if (!client) return 0;
      return await client.incrBy(`counter:${key}`, increment);
    } catch (error) {
      return 0;
    }
  }

  async incrementCounterWithTTL(key, ttl = 3600, increment = 1) {
    try {
      const client = await getRedisClient();
      if (!client) return 0;
      const result = await client.incrBy(`counter:${key}`, increment);
      await client.expire(`counter:${key}`, ttl);
      return result;
    } catch (error) {
      return 0;
    }
  }

  // Sorted set operations for time-series data
  async addToSortedSet(key, score, member) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.zAdd(`sortedset:${key}`, { score, value: member });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSortedSetByScore(key, min, max) {
    try {
      const client = await getRedisClient();
      if (!client) return [];
      return await client.zRangeByScore(`sortedset:${key}`, min, max);
    } catch (error) {
      return [];
    }
  }

  async removeFromSortedSetByScore(key, min, max) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.zRemRangeByScore(`sortedset:${key}`, min, max);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Session storage with Redis
export class RedisSession {
  constructor(prefix = 'session') {
    this.prefix = prefix;
  }

  async get(sessionId) {
    try {
      const client = await getRedisClient();
      if (!client) return null;
      const data = await client.get(`${this.prefix}:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async set(sessionId, data, ttl = 86400) { // 24 hours default
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.setEx(`${this.prefix}:${sessionId}`, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  }

  async destroy(sessionId) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.del(`${this.prefix}:${sessionId}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async touch(sessionId, ttl = 86400) {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.expire(`${this.prefix}:${sessionId}`, ttl);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Real-time pub/sub for Socket.io
export class RedisPubSub {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
  }

  async initialize() {
    try {
      this.publisher = await getRedisClient();
      if (!this.publisher) {
        console.warn('⚠️ Redis not available, Pub/Sub features disabled');
        return false;
      }
      this.subscriber = this.publisher.duplicate();
      await this.subscriber.connect();
      console.log('✅ Redis Pub/Sub initialized');
      return true;
    } catch (error) {
      console.error('❌ Redis Pub/Sub initialization failed:', error);
      return false;
    }
  }

  async publish(channel, message) {
    try {
      if (!this.publisher) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }
      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.subscriber) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }
      
      await this.subscriber.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          console.error('❌ Redis message parse error:', error);
        }
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async unsubscribe(channel) {
    try {
      if (this.subscriber) {
        await this.subscriber.unsubscribe(channel);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Analytics and metrics with Redis
export class RedisAnalytics {
  constructor() {
    this.prefix = 'analytics';
  }

  async trackEvent(event, data = {}, ttl = 86400 * 7) { // 7 days default
    try {
      const client = await getRedisClient();
      const timestamp = Date.now();
      const key = `${this.prefix}:events:${event}:${timestamp}`;
      
      await client.setEx(key, ttl, JSON.stringify({
        event,
        data,
        timestamp
      }));

      // Also increment daily counter
      const dateKey = `${this.prefix}:daily:${event}:${new Date().toISOString().split('T')[0]}`;
      await client.incr(dateKey);
      await client.expire(dateKey, ttl);

      return true;
    } catch (error) {
      console.error('❌ Redis analytics track error:', error);
      return false;
    }
  }

  async getEventCount(event, days = 7) {
    try {
      const client = await getRedisClient();
      const promises = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = `${this.prefix}:daily:${event}:${date.toISOString().split('T')[0]}`;
        promises.push(client.get(dateKey));
      }
      
      const results = await Promise.all(promises);
      return results.map((count, index) => ({
        date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        count: parseInt(count) || 0
      }));
    } catch (error) {
      console.error('❌ Redis analytics get error:', error);
      return [];
    }
  }
}

// Health check
export async function redisHealthCheck() {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    return false;
  }
}

// Graceful shutdown
export async function closeRedis() {
  try {
    if (redis) {
      await redis.disconnect();
      redis = null;
      console.log('✅ Redis connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing Redis:', error);
  }
}

// Initialize global instances
export const cache = new RedisCache();
export const session = new RedisSession();
export const pubsub = new RedisPubSub();
export const analytics = new RedisAnalytics();

export default redis;