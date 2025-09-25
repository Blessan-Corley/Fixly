/**
 * Comprehensive Rate Limiting Middleware
 * Redis-backed with configurable limits per endpoint
 */

import { Redis } from '@upstash/redis';

// Initialize Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Authentication endpoints
  '/api/auth/login': { requests: 5, window: 15 * 60 }, // 5 requests per 15 minutes
  '/api/auth/register': { requests: 3, window: 60 * 60 }, // 3 requests per hour
  '/api/auth/forgot-password': { requests: 3, window: 60 * 60 }, // 3 requests per hour
  '/api/auth/verify-otp': { requests: 10, window: 60 * 60 }, // 10 requests per hour

  // Job management endpoints
  '/api/jobs/post': { requests: 10, window: 60 * 60 }, // 10 posts per hour
  '/api/jobs/apply': { requests: 20, window: 60 * 60 }, // 20 applications per hour
  '/api/jobs/update': { requests: 30, window: 60 * 60 }, // 30 updates per hour

  // Review endpoints
  '/api/reviews/submit': { requests: 5, window: 60 * 60 }, // 5 reviews per hour
  '/api/reviews/helpful': { requests: 50, window: 60 * 60 }, // 50 helpful votes per hour

  // Messaging endpoints
  '/api/messages/send': { requests: 100, window: 60 * 60 }, // 100 messages per hour
  '/api/messages/mark-read': { requests: 200, window: 60 * 60 }, // 200 mark reads per hour

  // Profile and search endpoints
  '/api/user/update': { requests: 20, window: 60 * 60 }, // 20 profile updates per hour
  '/api/search': { requests: 100, window: 60 * 60 }, // 100 searches per hour
  '/api/location': { requests: 200, window: 60 * 60 }, // 200 location requests per hour

  // Payment endpoints
  '/api/payment/create': { requests: 10, window: 60 * 60 }, // 10 payment attempts per hour
  '/api/payment/verify': { requests: 20, window: 60 * 60 }, // 20 verifications per hour

  // Default fallback
  'default': { requests: 60, window: 60 * 60 }, // 60 requests per hour for unspecified endpoints
};

/**
 * Get client identifier from request
 */
function getClientId(req) {
  // Try to get user ID from session/token first
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  return `ip:${ip}`;
}

/**
 * Get rate limit configuration for endpoint
 */
function getRateLimitConfig(pathname) {
  // Find exact match first
  if (RATE_LIMITS[pathname]) {
    return RATE_LIMITS[pathname];
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern.includes('[') && pathname.match(pattern.replace(/\[.*?\]/g, '[^/]+'))) {
      return config;
    }
  }

  // Return default config
  return RATE_LIMITS.default;
}

/**
 * Main rate limiting middleware
 */
export default function rateLimitMiddleware(customConfig = {}) {
  return async (req, res, next) => {
    try {
      const pathname = req.url.split('?')[0]; // Remove query parameters
      const config = { ...getRateLimitConfig(pathname), ...customConfig };
      const clientId = getClientId(req);
      const key = `ratelimit:${pathname}:${clientId}`;

      // Get current count
      const current = await redis.get(key);
      const count = parseInt(current) || 0;

      // Check if limit exceeded
      if (count >= config.requests) {
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again after ${resetTime.toLocaleTimeString()}`,
          retryAfter: ttl,
          limit: config.requests,
          remaining: 0,
          resetTime: resetTime.toISOString()
        });
      }

      // Increment counter
      const newCount = count + 1;
      await redis.setex(key, config.window, newCount);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.requests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.requests - newCount));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (config.window * 1000)).toISOString());

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // On Redis error, allow request to proceed but log the issue
      next();
    }
  };
}

/**
 * Advanced rate limiting with burst allowance
 */
export function advancedRateLimit(config) {
  const { requests, window, burst = 0 } = config;

  return async (req, res, next) => {
    try {
      const pathname = req.url.split('?')[0];
      const clientId = getClientId(req);
      const key = `ratelimit:advanced:${pathname}:${clientId}`;
      const burstKey = `ratelimit:burst:${pathname}:${clientId}`;

      // Check normal rate limit
      const current = await redis.get(key);
      const count = parseInt(current) || 0;

      if (count >= requests) {
        // Check burst allowance
        if (burst > 0) {
          const burstUsed = await redis.get(burstKey);
          const burstCount = parseInt(burstUsed) || 0;

          if (burstCount < burst) {
            // Allow burst request
            await redis.setex(burstKey, window, burstCount + 1);
            res.setHeader('X-RateLimit-Burst-Used', burstCount + 1);
            res.setHeader('X-RateLimit-Burst-Remaining', burst - burstCount - 1);
            return next();
          }
        }

        const ttl = await redis.ttl(key);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests',
          retryAfter: ttl
        });
      }

      // Increment counter
      await redis.setex(key, window, count + 1);

      // Set headers
      res.setHeader('X-RateLimit-Limit', requests);
      res.setHeader('X-RateLimit-Remaining', requests - count - 1);

      next();
    } catch (error) {
      console.error('Advanced rate limiting error:', error);
      next();
    }
  };
}

/**
 * IP-based rate limiting for public endpoints
 */
export function ipRateLimit(requests = 100, window = 3600) {
  return async (req, res, next) => {
    try {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
      const key = `ratelimit:ip:${ip}`;

      const current = await redis.get(key);
      const count = parseInt(current) || 0;

      if (count >= requests) {
        return res.status(429).json({
          error: 'IP rate limit exceeded',
          message: 'Too many requests from this IP address'
        });
      }

      await redis.setex(key, window, count + 1);
      next();
    } catch (error) {
      console.error('IP rate limiting error:', error);
      next();
    }
  };
}

/**
 * User-specific rate limiting
 */
export function userRateLimit(requests = 60, window = 3600) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return next();
      }

      const key = `ratelimit:user:${req.user.id}`;
      const current = await redis.get(key);
      const count = parseInt(current) || 0;

      if (count >= requests) {
        return res.status(429).json({
          error: 'User rate limit exceeded',
          message: 'Too many requests from this account'
        });
      }

      await redis.setex(key, window, count + 1);
      next();
    } catch (error) {
      console.error('User rate limiting error:', error);
      next();
    }
  };
}

/**
 * Sliding window rate limiter (more accurate but resource intensive)
 */
export function slidingWindowRateLimit(requests, window) {
  return async (req, res, next) => {
    try {
      const pathname = req.url.split('?')[0];
      const clientId = getClientId(req);
      const key = `ratelimit:sliding:${pathname}:${clientId}`;
      const now = Date.now();
      const windowStart = now - (window * 1000);

      // Remove old entries
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      const currentCount = await redis.zcard(key);

      if (currentCount >= requests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests in sliding window'
        });
      }

      // Add current request
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, window);

      next();
    } catch (error) {
      console.error('Sliding window rate limiting error:', error);
      next();
    }
  };
}

/**
 * Reset rate limit for user (admin function)
 */
export async function resetRateLimit(userId, endpoint = null) {
  try {
    if (endpoint) {
      const key = `ratelimit:${endpoint}:user:${userId}`;
      await redis.del(key);
    } else {
      // Reset all rate limits for user
      const pattern = `ratelimit:*:user:${userId}`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
    return true;
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return false;
  }
}

/**
 * Get rate limit status for user
 */
export async function getRateLimitStatus(userId, endpoint) {
  try {
    const key = `ratelimit:${endpoint}:user:${userId}`;
    const current = await redis.get(key);
    const ttl = await redis.ttl(key);
    const config = getRateLimitConfig(endpoint);

    return {
      limit: config.requests,
      used: parseInt(current) || 0,
      remaining: Math.max(0, config.requests - (parseInt(current) || 0)),
      resetTime: ttl > 0 ? new Date(Date.now() + (ttl * 1000)) : null
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return null;
  }
}