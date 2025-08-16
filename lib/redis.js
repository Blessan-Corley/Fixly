// lib/redis.js - Redis client configuration and utilities
import { createClient } from 'redis';

let redis = null;

// Initialize Redis client
export async function getRedisClient() {
  if (!redis) {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      redis = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          commandTimeout: 5000,
          lazyConnect: true
        },
        retry_unfulfilled_commands: true,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.warn('⚠️ Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      redis.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      redis.on('connect', () => {
        console.log('🔗 Redis connecting...');
      });

      redis.on('ready', () => {
        console.log('✅ Redis client ready');
      });

      redis.on('end', () => {
        console.log('🔌 Redis connection ended');
      });

      await redis.connect();
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      redis = null;
      throw error;
    }
  }

  return redis;
}

// Enhanced rate limiting with Redis
export async function redisRateLimit(identifier, limit = 100, window = 3600, prefix = 'rate_limit') {
  try {
    const client = await getRedisClient();
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
    console.error('❌ Redis rate limit error:', error);
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
      const data = await client.get(`cache:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Redis cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const client = await getRedisClient();
      await client.setEx(`cache:${key}`, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Redis cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      const client = await getRedisClient();
      await client.del(`cache:${key}`);
      return true;
    } catch (error) {
      console.error('❌ Redis cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const client = await getRedisClient();
      return await client.exists(`cache:${key}`);
    } catch (error) {
      console.error('❌ Redis cache exists error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('❌ Redis cache invalidate error:', error);
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
      console.error('❌ Redis cache getOrSet error:', error);
      // Fallback to direct fetch
      return await fetchFn();
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
      const data = await client.get(`${this.prefix}:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Redis session get error:', error);
      return null;
    }
  }

  async set(sessionId, data, ttl = 86400) { // 24 hours default
    try {
      const client = await getRedisClient();
      await client.setEx(`${this.prefix}:${sessionId}`, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('❌ Redis session set error:', error);
      return false;
    }
  }

  async destroy(sessionId) {
    try {
      const client = await getRedisClient();
      await client.del(`${this.prefix}:${sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Redis session destroy error:', error);
      return false;
    }
  }

  async touch(sessionId, ttl = 86400) {
    try {
      const client = await getRedisClient();
      await client.expire(`${this.prefix}:${sessionId}`, ttl);
      return true;
    } catch (error) {
      console.error('❌ Redis session touch error:', error);
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
      this.subscriber = this.publisher.duplicate();
      await this.subscriber.connect();
      console.log('✅ Redis Pub/Sub initialized');
    } catch (error) {
      console.error('❌ Redis Pub/Sub initialization failed:', error);
    }
  }

  async publish(channel, message) {
    try {
      if (!this.publisher) await this.initialize();
      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('❌ Redis publish error:', error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.subscriber) await this.initialize();
      
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
      console.error('❌ Redis subscribe error:', error);
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
      console.error('❌ Redis unsubscribe error:', error);
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

// Initialize global instances
export const cache = new RedisCache();
export const session = new RedisSession();
export const pubsub = new RedisPubSub();
export const analytics = new RedisAnalytics();

// Health check
export async function redisHealthCheck() {
  try {
    const client = await getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
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

export default redis;