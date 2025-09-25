// lib/redis.js - Redis connection and utilities
import Redis from 'ioredis';

let redis;

const getRedisConfig = () => {
  // Check if we're using Upstash Redis (production)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Extract host from Upstash URL
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    const host = url.hostname;
    const port = url.port || 6379;

    console.log('🔧 Using Upstash Redis configuration');

    return {
      host: host,
      port: parseInt(port),
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      tls: {
        rejectUnauthorized: false
      },
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      family: 4, // Force IPv4
      keepAlive: true
    };
  } else if (process.env.REDIS_URL) {
    console.log('🔧 Using REDIS_URL configuration');
    return process.env.REDIS_URL;
  } else {
    console.log('🔧 Using local Redis configuration');
    // Default local Redis configuration
    return {
      host: 'localhost',
      port: 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };
  }
};

export const initRedis = () => {
  if (!redis) {
    try {
      const config = getRedisConfig();
      redis = new Redis(config);

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
      });

      redis.on('ready', () => {
        console.log('🚀 Redis is ready to use');
      });

      redis.on('close', () => {
        console.log('🔌 Redis connection closed');
      });

    } catch (error) {
      console.error('💥 Failed to initialize Redis:', error);
      // Fallback to null if Redis is not available
      redis = null;
    }
  }
  return redis;
};

export const getRedis = () => {
  if (!redis) {
    return initRedis();
  }
  return redis;
};

// Alias for backward compatibility
export const getRedisClient = () => {
  return getRedis();
};

// Redis utility functions
export const redisUtils = {
  // Set key with expiration
  async set(key, value, expirationInSeconds = 3600) {
    try {
      const client = getRedis();
      if (!client) return false;

      const serializedValue = JSON.stringify(value);
      await client.setex(key, expirationInSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  // Get key
  async get(key) {
    try {
      const client = getRedis();
      if (!client) return null;

      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  // Delete key
  async del(key) {
    try {
      const client = getRedis();
      if (!client) return false;

      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      const client = getRedis();
      if (!client) return false;

      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  },

  // Increment counter with expiration
  async incr(key, expirationInSeconds = 3600) {
    try {
      const client = getRedis();
      if (!client) return 1;

      const pipeline = client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, expirationInSeconds);
      const results = await pipeline.exec();

      return results[0][1]; // Return the incremented value
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 1;
    }
  },

  // Get TTL (time to live) of a key
  async ttl(key) {
    try {
      const client = getRedis();
      if (!client) return -1;

      return await client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return -1;
    }
  },

  // Set hash field
  async hset(hash, field, value, expirationInSeconds = 3600) {
    try {
      const client = getRedis();
      if (!client) return false;

      const serializedValue = JSON.stringify(value);
      const pipeline = client.pipeline();
      pipeline.hset(hash, field, serializedValue);
      pipeline.expire(hash, expirationInSeconds);
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis HSET error:', error);
      return false;
    }
  },

  // Get hash field
  async hget(hash, field) {
    try {
      const client = getRedis();
      if (!client) return null;

      const value = await client.hget(hash, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis HGET error:', error);
      return null;
    }
  },

  // Delete hash field
  async hdel(hash, field) {
    try {
      const client = getRedis();
      if (!client) return false;

      await client.hdel(hash, field);
      return true;
    } catch (error) {
      console.error('Redis HDEL error:', error);
      return false;
    }
  }
};

// Rate limiting function using Redis
export const redisRateLimit = async (identifier, limit, windowInSeconds) => {
  try {
    const client = getRedis();
    if (!client) {
      // Fallback: allow if Redis is not available
      return { success: true, remaining: limit };
    }

    const key = `rate_limit:${identifier}`;
    const current = await redisUtils.incr(key, windowInSeconds);

    if (current > limit) {
      const ttl = await redisUtils.ttl(key);
      return {
        success: false,
        remaining: 0,
        resetTime: Date.now() + (ttl * 1000)
      };
    }

    return {
      success: true,
      remaining: Math.max(0, limit - current),
      resetTime: Date.now() + (windowInSeconds * 1000)
    };

  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback: allow if there's an error
    return { success: true, remaining: limit };
  }
};

// OTP storage functions using Redis
export const otpRedis = {
  // Store OTP
  async store(email, otp, purpose = 'verification', expirationInSeconds = 300) {
    const key = `otp:${email}:${purpose}`;
    const data = {
      otp,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };

    return await redisUtils.set(key, data, expirationInSeconds);
  },

  // Verify OTP
  async verify(email, inputOTP, purpose = 'verification') {
    const key = `otp:${email}:${purpose}`;
    const data = await redisUtils.get(key);

    if (!data) {
      return {
        success: false,
        message: 'OTP not found or expired. Please request a new one.'
      };
    }

    // Increment attempts
    data.attempts += 1;

    if (data.attempts > data.maxAttempts) {
      await redisUtils.del(key);
      return {
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.'
      };
    }

    if (data.otp === inputOTP) {
      await redisUtils.del(key); // Remove OTP after successful verification
      return {
        success: true,
        message: 'OTP verified successfully!'
      };
    } else {
      // Update attempts count
      const ttl = await redisUtils.ttl(key);
      await redisUtils.set(key, data, ttl > 0 ? ttl : 300);

      const remainingAttempts = data.maxAttempts - data.attempts;
      return {
        success: false,
        message: `Incorrect OTP. ${remainingAttempts} attempts remaining.`
      };
    }
  },

  // Check OTP status
  async checkStatus(email, purpose = 'verification') {
    const key = `otp:${email}:${purpose}`;
    const data = await redisUtils.get(key);
    const ttl = await redisUtils.ttl(key);

    if (!data || ttl <= 0) {
      return { exists: false, expired: true };
    }

    return {
      exists: true,
      expired: false,
      timeRemaining: ttl,
      attemptsLeft: data.maxAttempts - data.attempts,
      createdAt: data.createdAt
    };
  },

  // Delete OTP
  async remove(email, purpose = 'verification') {
    const key = `otp:${email}:${purpose}`;
    return await redisUtils.del(key);
  }
};

// Session caching functions
export const sessionRedis = {
  // Store session data
  async store(sessionId, sessionData, expirationInSeconds = 86400) { // 24 hours default
    const key = `session:${sessionId}`;
    return await redisUtils.set(key, sessionData, expirationInSeconds);
  },

  // Get session data
  async get(sessionId) {
    const key = `session:${sessionId}`;
    return await redisUtils.get(key);
  },

  // Update session
  async update(sessionId, sessionData, expirationInSeconds = 86400) {
    const key = `session:${sessionId}`;
    return await redisUtils.set(key, sessionData, expirationInSeconds);
  },

  // Delete session
  async remove(sessionId) {
    const key = `session:${sessionId}`;
    return await redisUtils.del(key);
  },

  // Extend session TTL
  async extend(sessionId, expirationInSeconds = 86400) {
    const key = `session:${sessionId}`;
    const data = await redisUtils.get(key);
    if (data) {
      return await redisUtils.set(key, data, expirationInSeconds);
    }
    return false;
  }
};

export default {
  initRedis,
  getRedis,
  redisUtils,
  redisRateLimit,
  otpRedis,
  sessionRedis
};