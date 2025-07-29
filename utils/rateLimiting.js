// utils/rateLimiting.js
// Remove the import of headers from next/headers

// In-memory store for rate limiting (in production, use Redis)
const requestStore = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (now - data.resetTime > data.windowMs) {
      requestStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export async function rateLimit(request, identifier, maxRequests = 100, windowMs = 60 * 1000) {
  try {
    // Get client IP from request object
    let clientIP = 'unknown';
    
    if (request) {
      // Try different ways to get IP from the request
      if (request.ip) {
        clientIP = request.ip;
      } else if (request.headers) {
        // Use request.headers directly (not headers() function)
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIP = request.headers.get('x-real-ip');
        clientIP = forwardedFor?.split(',')[0] || realIP || 'unknown';
      }
    }

    const key = `${identifier}_${clientIP}`;
    const now = Date.now();

    // Get or create rate limit data
    let rateLimitData = requestStore.get(key);
    
    if (!rateLimitData) {
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs,
        windowMs: windowMs
      };
      requestStore.set(key, rateLimitData);
    }

    // Reset if window has passed
    if (now > rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + windowMs;
    }

    // Increment count
    rateLimitData.count++;

    // Check if limit exceeded
    if (rateLimitData.count > maxRequests) {
      const resetIn = Math.ceil((rateLimitData.resetTime - now) / 1000);
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetTime: rateLimitData.resetTime,
        resetIn: resetIn
      };
    }

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - rateLimitData.count,
      resetTime: rateLimitData.resetTime,
      resetIn: Math.ceil((rateLimitData.resetTime - now) / 1000)
    };

  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: Date.now() + windowMs,
      resetIn: Math.ceil(windowMs / 1000)
    };
  }
}

// Middleware for API routes
export function withRateLimit(handler, options = {}) {
  const {
    maxRequests = 100,
    windowMs = 60 * 1000,
    identifier = 'default',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return async (request, context) => {
    const rateLimitResult = await rateLimit(request, identifier, maxRequests, windowMs);
    
    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.resetIn} seconds.`,
          retryAfter: rateLimitResult.resetIn
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': rateLimitResult.resetIn.toString()
          }
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request, context);
    
    if (response instanceof Response) {
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    }

    return response;
  };
}

// Special rate limiter for authentication attempts
export async function authRateLimit(identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return rateLimit(null, `auth_${identifier}`, maxAttempts, windowMs);
}

// Rate limiter for job applications
export async function applicationRateLimit(userId, maxApplications = 10, windowMs = 60 * 60 * 1000) {
  return rateLimit(null, `applications_${userId}`, maxApplications, windowMs);
}

// Rate limiter for job posting (6-hour limit)
export async function jobPostingRateLimit(userId) {
  const sixHours = 6 * 60 * 60 * 1000;
  return rateLimit(null, `job_posting_${userId}`, 1, sixHours);
}