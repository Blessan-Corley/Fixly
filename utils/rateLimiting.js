// utils/rateLimiting.js - Enhanced rate limiting with Redis support
import { NextResponse } from 'next/server';
import { redisRateLimit, redisHealthCheck } from '../lib/redis';

// Fallback in-memory store when Redis is unavailable
const rateLimitStore = new Map();
let useRedis = null;

// Rate limit configuration
const rateLimitConfig = {
  // Login attempts
  login_attempts: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDuration: 30 * 60 * 1000 // 30 minutes block
  },
  // Job posting
  job_posting: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDuration: 6 * 60 * 60 * 1000 // 6 hours block
  },
  // API requests
  api_requests: {
    maxAttempts: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDuration: 60 * 60 * 1000 // 1 hour block
  },
  // Password reset
  password_reset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDuration: 24 * 60 * 60 * 1000 // 24 hours block
  },
  // Email verification
  email_verification: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDuration: 24 * 60 * 60 * 1000 // 24 hours block
  },
  // File upload
  file_upload: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDuration: 6 * 60 * 60 * 1000 // 6 hours block
  }
};

// Get client IP address
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback for development
  return '127.0.0.1';
}

// Clean up expired entries
function cleanupExpiredEntries() {
  const now = Date.now();
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.expiresAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Check Redis availability (cached for performance)
async function checkRedisAvailability() {
  if (useRedis === null) {
    useRedis = await redisHealthCheck();
    console.log(useRedis ? '✅ Using Redis for rate limiting' : '⚠️ Falling back to in-memory rate limiting');
  }
  return useRedis;
}

// Enhanced rate limiting function with Redis support
export async function rateLimit(request, type, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  try {
    const clientIP = getClientIP(request);
    const key = `${type}:${clientIP}`;
    const now = Date.now();
    
    // Get rate limit configuration
    const config = rateLimitConfig[type] || {
      maxAttempts,
      windowMs,
      blockDuration: windowMs * 2
    };

    // Try Redis first
    if (await checkRedisAvailability()) {
      const windowSeconds = Math.ceil(config.windowMs / 1000);
      const result = await redisRateLimit(
        key,
        config.maxAttempts,
        windowSeconds,
        'rate_limit'
      );

      if (!result.fallback) {
        return {
          success: result.success,
          remainingAttempts: result.remaining,
          resetTime: result.resetTime,
          remainingTime: result.retryAfter ? result.retryAfter * 60 * 1000 : (result.resetTime - Date.now()),
          isBlocked: !result.success,
          message: result.success ? 
            `Request allowed. ${result.remaining} attempts remaining.` :
            `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000 / 60)} minutes.`
        };
      }
    }

    // Fallback to in-memory rate limiting
    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup
      cleanupExpiredEntries();
    }
    
    // Get existing rate limit data
    const existingData = rateLimitStore.get(key);
    
    if (existingData) {
      // Check if user is blocked
      if (existingData.blockedUntil && existingData.blockedUntil > now) {
        const remainingBlockTime = Math.ceil((existingData.blockedUntil - now) / 1000 / 60);
        return {
          success: false,
          message: `Too many attempts. Please try again in ${remainingBlockTime} minutes.`,
          remainingTime: existingData.blockedUntil - now,
          isBlocked: true
        };
      }
      
      // Check if window has expired
      if (existingData.windowStart + config.windowMs < now) {
        // Reset window
        rateLimitStore.set(key, {
          attempts: 1,
          windowStart: now,
          blockedUntil: null,
          expiresAt: now + config.windowMs
        });
        
        return {
          success: true,
          remainingAttempts: config.maxAttempts - 1,
          resetTime: now + config.windowMs
        };
      }
      
      // Check if max attempts reached
      if (existingData.attempts >= config.maxAttempts) {
        // Block user
        const blockedUntil = now + config.blockDuration;
        rateLimitStore.set(key, {
          ...existingData,
          blockedUntil,
          expiresAt: blockedUntil
        });
        
        return {
          success: false,
          message: `Too many attempts. Please try again in ${Math.ceil(config.blockDuration / 1000 / 60)} minutes.`,
          remainingTime: config.blockDuration,
          isBlocked: true
        };
      }
      
      // Increment attempts
      existingData.attempts += 1;
      rateLimitStore.set(key, existingData);
      
      return {
        success: true,
        remainingAttempts: config.maxAttempts - existingData.attempts,
        resetTime: existingData.windowStart + config.windowMs
      };
    } else {
      // First attempt
      rateLimitStore.set(key, {
        attempts: 1,
        windowStart: now,
        blockedUntil: null,
        expiresAt: now + config.windowMs
      });
      
      return {
        success: true,
        remainingAttempts: config.maxAttempts - 1,
        resetTime: now + config.windowMs
      };
    }
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Allow request to proceed if rate limiting fails
    return {
      success: true,
      remainingAttempts: 999,
      resetTime: Date.now() + 15 * 60 * 1000
    };
  }
}

// Middleware for API routes
export function withRateLimit(type, maxAttempts, windowMs) {
  return async function rateLimitMiddleware(request) {
    const result = await rateLimit(request, type, maxAttempts, windowMs);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: result.message,
          remainingTime: result.remainingTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + result.remainingTime).toISOString(),
            'Retry-After': Math.ceil(result.remainingTime / 1000).toString()
          }
        }
      );
    }
    
    return null; // Continue to next middleware/handler
  };
}

// Get rate limit info for a client
export function getRateLimitInfo(request, type) {
  const clientIP = getClientIP(request);
  const key = `${type}:${clientIP}`;
  const data = rateLimitStore.get(key);
  
  if (!data) {
    return {
      attempts: 0,
      remainingAttempts: rateLimitConfig[type]?.maxAttempts || 5,
      resetTime: null,
      isBlocked: false
    };
  }
  
  const config = rateLimitConfig[type] || { maxAttempts: 5 };
  const now = Date.now();
  
  return {
    attempts: data.attempts,
    remainingAttempts: Math.max(0, config.maxAttempts - data.attempts),
    resetTime: data.windowStart + (rateLimitConfig[type]?.windowMs || 15 * 60 * 1000),
    isBlocked: data.blockedUntil && data.blockedUntil > now,
    blockedUntil: data.blockedUntil
  };
}

// Reset rate limit for a client (admin function)
export function resetRateLimit(clientIP, type) {
  const key = `${type}:${clientIP}`;
  rateLimitStore.delete(key);
  return true;
}

// Get all rate limit data (admin function)
export function getAllRateLimitData() {
  const data = {};
  
  for (const [key, value] of rateLimitStore.entries()) {
    data[key] = {
      attempts: value.attempts,
      windowStart: value.windowStart,
      blockedUntil: value.blockedUntil,
      expiresAt: value.expiresAt
    };
  }
  
  return data;
}

// Clean up all rate limit data (admin function)
export function clearAllRateLimitData() {
  rateLimitStore.clear();
  return true;
}