// lib/redis.js - Redis connection and utilities
import Redis from 'ioredis';

let redis;

const getRedisConfig = () => {
  // Check if we have Upstash Redis configuration
  if (process.env.REDIS_URL) {
    console.log('✅ [Redis] Using Upstash Redis with REDIS_URL');

    // Parse the Redis URL to extract components
    const url = new URL(process.env.REDIS_URL);

    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || process.env.UPSTASH_REDIS_REST_TOKEN,
      username: url.username === 'default' ? undefined : url.username,
      tls: {}, // Upstash Redis requires TLS
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 15000,
      commandTimeout: 8000,
      family: 4, // Force IPv4
      keepAlive: true,
      // Upstash specific optimizations
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    };
  } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('✅ [Redis] Using Upstash Redis with REST URL and token');

    // Extract host from Upstash REST URL
    const restUrl = new URL(process.env.UPSTASH_REDIS_REST_URL);
    const host = restUrl.hostname;

    return {
      host: host,
      port: 6379,
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      username: 'default',
      tls: {}, // Upstash requires TLS
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 15000,
      commandTimeout: 8000,
      family: 4, // Force IPv4
      keepAlive: true,
      enableReadyCheck: false
    };
  } else {
    console.warn('⚠️ [Redis] No Upstash configuration found, using local fallback');
    // Local Redis fallback
    return {
      host: 'localhost',
      port: 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000
    };
  }
};

export const initRedis = () => {
  if (!redis) {
    try {
      const config = getRedisConfig();
      console.log('🔧 [Redis] Initializing connection to Upstash Redis...');

      redis = new Redis(config);

      redis.on('connect', () => {
        console.log('🎉 [Redis] Successfully connected to Upstash Redis!');
      });

      redis.on('ready', () => {
        console.log('🚀 [Redis] Upstash Redis is ready and operational');

        // Test the connection with a simple ping
        redis.ping().then(() => {
          console.log('✅ [Redis] Connection verified with successful ping');
        }).catch((err) => {
          console.warn('⚠️ [Redis] Ping test failed:', err.message);
        });
      });

      redis.on('error', (err) => {
        // Specific error handling for different types of errors
        if (err.message.includes('ENOTFOUND')) {
          console.warn('🌐 [Redis] DNS resolution failed - check network connectivity');
        } else if (err.message.includes('ECONNRESET')) {
          console.warn('🔌 [Redis] Connection reset - will attempt to reconnect');
        } else if (err.message.includes('AUTH')) {
          console.error('🔐 [Redis] Authentication failed - check credentials');
        } else {
          console.warn('⚠️ [Redis] Connection issue (gracefully handled):', err.message);
        }

        // Don't crash the application - Redis is optional
      });

      redis.on('close', () => {
        console.log('🔌 [Redis] Connection closed - application continues in fallback mode');
      });

      redis.on('reconnecting', (time) => {
        console.log(`🔄 [Redis] Attempting to reconnect... (retry in ${time}ms)`);
      });

      redis.on('end', () => {
        console.log('📡 [Redis] Connection ended - operating in fallback mode');
      });

      // Add connection timeout handling
      setTimeout(() => {
        if (redis && redis.status === 'connecting') {
          console.warn('⏰ [Redis] Connection timeout - switching to fallback mode');
          redis.disconnect();
          redis = null;
        }
      }, 20000); // 20 second timeout

    } catch (error) {
      console.error('💥 [Redis] Initialization failed:', error.message);
      console.log('🔄 [Redis] Switching to fallback mode - application will continue without caching');
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
  // Set key with expiration (enhanced with compression for large values)
  async set(key, value, expirationInSeconds = 3600) {
    try {
      const client = getRedis();
      if (!client) {
        console.warn('Redis client not available, falling back gracefully');
        return false;
      }

      const serializedValue = JSON.stringify(value);

      // For large values, we might want to compress or warn
      if (serializedValue.length > 100000) { // 100KB
        console.warn(`Large Redis value being stored: ${key} (${serializedValue.length} bytes)`);
      }

      await client.setex(key, expirationInSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error(`Redis SET error for key "${key}":`, error);
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