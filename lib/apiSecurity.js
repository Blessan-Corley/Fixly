/**
 * Comprehensive API Security Wrapper
 * Applies all security middlewares to API endpoints
 *
 * ⚠️ DEPRECATED: This file is not used by any API routes.
 * Individual routes use utils/rateLimiting.js directly.
 * Kept for reference/documentation purposes only.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withRateLimit } from '../utils/rateLimiting';
import cacheMiddleware from './redisCache';
import { contentValidationMiddleware } from './contentValidation';
import inputSanitizationMiddleware, { securityHeaders } from './inputSanitization';

// Security configuration presets
export const SECURITY_PRESETS = {
  STRICT: {
    rateLimit: { requests: 10, window: 3600 }, // 10 requests per hour
    sanitization: 'strict',
    validation: true,
    cache: false
  },
  MODERATE: {
    rateLimit: { requests: 60, window: 3600 }, // 60 requests per hour
    sanitization: 'api',
    validation: true,
    cache: { ttl: 300 } // 5 minutes
  },
  RELAXED: {
    rateLimit: { requests: 200, window: 3600 }, // 200 requests per hour
    sanitization: 'relaxed',
    validation: false,
    cache: { ttl: 600 } // 10 minutes
  },
  PUBLIC: {
    rateLimit: { requests: 100, window: 900 }, // 100 requests per 15 minutes
    sanitization: 'api',
    validation: false,
    cache: { ttl: 1800 } // 30 minutes
  }
};

/**
 * Apply security middlewares to API handler
 */
export function withApiSecurity(handler, options = {}) {
  return async (request, context) => {
    const startTime = Date.now();

    try {
      // Apply security preset or custom options
      const config = options.preset
        ? { ...SECURITY_PRESETS[options.preset], ...options }
        : { ...SECURITY_PRESETS.MODERATE, ...options };

      // Create Express-like req/res objects for middleware compatibility
      const req = await createMiddlewareRequest(request);
      const res = createMiddlewareResponse();

      // Apply security headers
      const securityHeadersResult = await applyMiddleware(securityHeaders(), req, res);
      if (securityHeadersResult.error) {
        return createErrorResponse('Security headers failed', 500);
      }

      // Apply rate limiting (DEPRECATED - use utils/rateLimiting.js directly)
      if (config.rateLimit) {
        console.warn('⚠️ DEPRECATED: Use utils/rateLimiting.js directly instead of apiSecurity.js');
        // Fallback to prevent errors - use new rate limiting system
        const rateLimitResult = await withRateLimit('api_requests')(req);
        if (rateLimitResult && rateLimitResult.status === 429) {
          return rateLimitResult;
        }
      }

      // Apply input sanitization
      if (config.sanitization) {
        let sanitizationMiddleware;
        switch (config.sanitization) {
          case 'strict':
            sanitizationMiddleware = inputSanitizationMiddleware({
              maxStringLength: 1000,
              maxArrayLength: 20,
              maxObjectDepth: 5,
              maxKeys: 20
            });
            break;
          case 'relaxed':
            sanitizationMiddleware = inputSanitizationMiddleware({
              maxStringLength: 50000,
              maxArrayLength: 500,
              maxObjectDepth: 15,
              maxKeys: 100
            });
            break;
          default:
            sanitizationMiddleware = inputSanitizationMiddleware();
        }

        const sanitizationResult = await applyMiddleware(sanitizationMiddleware, req, res);
        if (sanitizationResult.error) {
          return createErrorResponse(
            'Input sanitization failed',
            400,
            { message: sanitizationResult.message }
          );
        }
      }

      // Apply content validation
      if (config.validation) {
        const validationResult = await applyMiddleware(
          contentValidationMiddleware(),
          req,
          res
        );
        if (validationResult.error) {
          return createErrorResponse(
            'Content validation failed',
            400,
            { message: validationResult.message }
          );
        }
      }

      // Apply caching for GET requests
      if (config.cache && request.method === 'GET') {
        const cacheResult = await applyMiddleware(
          cacheMiddleware(config.cache),
          req,
          res
        );
        if (cacheResult.cached) {
          return cacheResult.response;
        }
      }

      // Call the actual handler with sanitized data
      const handlerRequest = {
        ...request,
        json: async () => req.body || {},
        url: req.url,
        headers: new Headers(req.headers)
      };

      const response = await handler(handlerRequest, context);

      // Add security headers to response
      addSecurityHeaders(response);

      // Add performance metrics
      const duration = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Security-Applied', 'true');

      return response;

    } catch (error) {
      console.error('API Security wrapper error:', error);
      return createErrorResponse('Internal security error', 500);
    }
  };
}

/**
 * Create middleware-compatible request object
 */
async function createMiddlewareRequest(request) {
  const url = new URL(request.url);

  // Get session for user context
  const session = await getServerSession(authOptions);

  const req = {
    method: request.method,
    url: request.url,
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: Object.fromEntries(request.headers.entries()),
    user: session?.user || null,
    body: null,
    connection: { remoteAddress: request.headers.get('x-forwarded-for') || 'unknown' }
  };

  // Parse body for non-GET requests
  if (request.method !== 'GET') {
    try {
      req.body = await request.json();
    } catch (error) {
      req.body = {};
    }
  }

  return req;
}

/**
 * Create middleware-compatible response object
 */
function createMiddlewareResponse() {
  const headers = new Map();
  let statusCode = 200;
  let responseData = null;

  return {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
          return { status: statusCode, data };
        }
      };
    },
    json: (data) => {
      responseData = data;
      return { data };
    },
    setHeader: (name, value) => {
      headers.set(name, value);
    },
    getHeaders: () => headers,
    getStatus: () => statusCode,
    getData: () => responseData
  };
}

/**
 * Apply middleware and handle results
 */
async function applyMiddleware(middleware, req, res) {
  return new Promise((resolve) => {
    try {
      middleware(req, res, (error) => {
        if (error) {
          resolve({ error: true, message: error.message });
        } else {
          resolve({ error: false });
        }
      });
    } catch (error) {
      resolve({ error: true, message: error.message });
    }
  });
}

/**
 * Create standardized error response
 */
function createErrorResponse(message, status, extra = {}) {
  return NextResponse.json(
    {
      error: true,
      message,
      timestamp: new Date().toISOString(),
      ...extra
    },
    { status }
  );
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response) {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Strict transport security
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content security policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://res.cloudinary.com https://maps.googleapis.com",
    "connect-src 'self' https://api.upstash.io https://maps.googleapis.com https://api.stripe.com"
  ].join('; '));

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
}

/**
 * Authentication wrapper
 */
export function withAuth(handler, options = {}) {
  return withApiSecurity(async (request, context) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return createErrorResponse('Authentication required', 401);
    }

    // Check role if specified
    if (options.role && session.user.role !== options.role) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Add user to request context
    const userRequest = {
      ...request,
      user: session.user,
      userId: session.user.id
    };

    return handler(userRequest, context);
  }, options);
}

/**
 * Admin-only wrapper
 */
export function withAdmin(handler, options = {}) {
  return withAuth(handler, { ...options, role: 'admin' });
}

/**
 * Specific endpoint security configurations
 */
export const ENDPOINT_CONFIGS = {
  // Authentication endpoints
  '/api/auth/login': { preset: 'STRICT' },
  '/api/auth/register': { preset: 'STRICT' },
  '/api/auth/forgot-password': { preset: 'STRICT' },

  // Job management
  '/api/jobs/post': {
    preset: 'MODERATE',
    rateLimit: { requests: 10, window: 3600 }
  },
  '/api/jobs/apply': {
    preset: 'MODERATE',
    rateLimit: { requests: 20, window: 3600 }
  },
  '/api/jobs/browse': {
    preset: 'PUBLIC',
    cache: { ttl: 300 }
  },

  // Reviews
  '/api/reviews/submit': {
    preset: 'STRICT',
    rateLimit: { requests: 5, window: 3600 }
  },

  // Messaging
  '/api/messages/send': {
    preset: 'MODERATE',
    rateLimit: { requests: 100, window: 3600 }
  },

  // User profile
  '/api/user/update': {
    preset: 'MODERATE',
    rateLimit: { requests: 20, window: 3600 }
  },

  // Admin endpoints
  '/api/admin/*': {
    preset: 'STRICT',
    rateLimit: { requests: 50, window: 3600 }
  }
};

/**
 * Get security config for endpoint
 */
export function getEndpointConfig(pathname) {
  // Check for exact match
  if (ENDPOINT_CONFIGS[pathname]) {
    return ENDPOINT_CONFIGS[pathname];
  }

  // Check for wildcard matches
  for (const [pattern, config] of Object.entries(ENDPOINT_CONFIGS)) {
    if (pattern.includes('*') && pathname.startsWith(pattern.replace('*', ''))) {
      return config;
    }
  }

  // Default configuration
  return { preset: 'MODERATE' };
}

/**
 * Validation schemas for common endpoints
 */
export const VALIDATION_SCHEMAS = {
  jobPost: {
    title: { required: true, maxLength: 100 },
    description: { required: true, maxLength: 2000 },
    budget: { required: true, type: 'object' },
    location: { required: true, type: 'object' },
    deadline: { required: true, type: 'date' }
  },

  reviewSubmit: {
    jobId: { required: true, type: 'string' },
    rating: { required: true, min: 1, max: 5 },
    comment: { required: true, minLength: 10, maxLength: 1000 }
  },

  userUpdate: {
    name: { required: false, maxLength: 50 },
    email: { required: false, type: 'email' },
    phone: { required: false, type: 'phone' }
  }
};

/**
 * Quick security wrapper for simple endpoints
 */
export function secured(handler, preset = 'MODERATE') {
  return withApiSecurity(handler, { preset });
}

/**
 * Batch apply security to multiple handlers
 */
export function secureEndpoints(handlers) {
  const secured = {};

  Object.entries(handlers).forEach(([path, handler]) => {
    const config = getEndpointConfig(path);
    secured[path] = withApiSecurity(handler, config);
  });

  return secured;
}