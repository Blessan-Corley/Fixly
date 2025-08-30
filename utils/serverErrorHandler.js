// utils/serverErrorHandler.js - Comprehensive server-side error handling
import { NextResponse } from 'next/server';

export class ServerErrorHandler {
  static errorCodes = {
    // Authentication & Authorization
    UNAUTHORIZED: { code: 401, message: 'Authentication required' },
    FORBIDDEN: { code: 403, message: 'Access denied' },
    ADMIN_REQUIRED: { code: 403, message: 'Admin access required' },
    ACCOUNT_SUSPENDED: { code: 403, message: 'Account suspended' },
    ACCOUNT_BANNED: { code: 403, message: 'Account banned' },
    
    // Validation & Input
    VALIDATION_ERROR: { code: 400, message: 'Invalid input data' },
    MISSING_FIELDS: { code: 400, message: 'Required fields missing' },
    INVALID_FORMAT: { code: 400, message: 'Invalid data format' },
    FILE_TOO_LARGE: { code: 413, message: 'File size exceeds limit' },
    
    // Resources
    NOT_FOUND: { code: 404, message: 'Resource not found' },
    CONFLICT: { code: 409, message: 'Resource already exists' },
    GONE: { code: 410, message: 'Resource no longer available' },
    
    // Rate Limiting & Throttling
    RATE_LIMIT: { code: 429, message: 'Too many requests' },
    QUOTA_EXCEEDED: { code: 429, message: 'Quota exceeded' },
    
    // Database & External Services
    DATABASE_ERROR: { code: 500, message: 'Database connection failed' },
    EXTERNAL_SERVICE_ERROR: { code: 502, message: 'External service unavailable' },
    SERVICE_TIMEOUT: { code: 504, message: 'Service timeout' },
    
    // General Server Errors
    INTERNAL_ERROR: { code: 500, message: 'Internal server error' },
    NOT_IMPLEMENTED: { code: 501, message: 'Feature not implemented' },
    MAINTENANCE: { code: 503, message: 'Service under maintenance' }
  };

  static createError(errorType, details = null, context = {}) {
    const errorInfo = this.errorCodes[errorType] || this.errorCodes.INTERNAL_ERROR;
    
    const error = {
      error: errorInfo.message,
      code: errorType,
      timestamp: new Date().toISOString(),
      requestId: context.requestId || this.generateRequestId(),
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && context.stack && { stack: context.stack })
    };

    return NextResponse.json(error, { 
      status: errorInfo.code,
      headers: this.getSecurityHeaders()
    });
  }

  static handleError(error, context = {}) {
    // Log error with context
    this.logError(error, context);

    // Categorize error
    const errorType = this.categorizeError(error);
    const errorInfo = this.errorCodes[errorType] || this.errorCodes.INTERNAL_ERROR;

    // Prepare response
    const response = {
      error: errorInfo.message,
      code: errorType,
      timestamp: new Date().toISOString(),
      requestId: context.requestId || this.generateRequestId()
    };

    // Add details in development
    if (process.env.NODE_ENV === 'development') {
      response.details = {
        message: error.message,
        stack: error.stack,
        context
      };
    }

    return NextResponse.json(response, { 
      status: errorInfo.code,
      headers: this.getSecurityHeaders()
    });
  }

  static categorizeError(error) {
    // MongoDB/Database errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) return 'CONFLICT'; // Duplicate key
      return 'DATABASE_ERROR';
    }

    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      return 'VALIDATION_ERROR';
    }

    // JWT/Auth errors
    if (error.name === 'JsonWebTokenError') {
      return 'UNAUTHORIZED';
    }

    // Network/Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return 'SERVICE_TIMEOUT';
    }

    // File size errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return 'FILE_TOO_LARGE';
    }

    // Rate limiting
    if (error.message?.includes('rate limit') || error.code === 429) {
      return 'RATE_LIMIT';
    }

    // Default to internal error
    return 'INTERNAL_ERROR';
  }

  static logError(error, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: {
        userId: context.userId,
        userEmail: context.userEmail,
        userRole: context.userRole,
        method: context.method,
        url: context.url,
        userAgent: context.userAgent,
        ip: context.ip,
        requestId: context.requestId
      },
      severity: this.getSeverity(error)
    };

    // Console logging with color coding
    const severity = logEntry.severity;
    const color = {
      low: '\x1b[36m',    // cyan
      medium: '\x1b[33m', // yellow
      high: '\x1b[31m',   // red
      critical: '\x1b[35m' // magenta
    }[severity] || '\x1b[0m';

    console.error(`${color}[${severity.toUpperCase()}] Server Error\x1b[0m`);
    console.error('Error:', error.message);
    console.error('Context:', JSON.stringify(context, null, 2));
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack:', error.stack);
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production' && ['high', 'critical'].includes(severity)) {
      this.sendToLoggingService(logEntry);
    }
  }

  static getSeverity(error) {
    // Critical - system-breaking errors
    if (error.name === 'MongoError' && error.code !== 11000) return 'critical';
    if (error.message?.includes('ECONNREFUSED')) return 'critical';
    
    // High - significant functionality impacted
    if (error.name === 'ValidationError') return 'high';
    if (error.name === 'JsonWebTokenError') return 'high';
    if (error.code === 'LIMIT_FILE_SIZE') return 'high';
    
    // Medium - user experience affected
    if (error.code === 11000) return 'medium'; // Duplicate key
    if (error.name === 'TimeoutError') return 'medium';
    
    // Low - minor issues
    return 'low';
  }

  static getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
  }

  static generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async sendToLoggingService(logEntry) {
    try {
      // In production, send to external logging service (e.g., Sentry, LogRocket, etc.)
      // For now, just log to console
      console.log('📤 Sending to logging service:', logEntry);
    } catch (err) {
      console.error('Failed to send error to logging service:', err);
    }
  }

  // Middleware wrapper for API routes
  static withErrorHandling(handler) {
    return async (request, context = {}) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      try {
        // Add request context
        const enrichedContext = {
          ...context,
          requestId,
          method: request.method,
          url: request.url,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          startTime
        };

        const result = await handler(request, enrichedContext);
        
        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          const duration = Date.now() - startTime;
          console.log(`✅ ${request.method} ${request.url} - ${duration}ms`);
        }

        return result;
      } catch (error) {
        const enrichedContext = {
          ...context,
          requestId,
          method: request.method,
          url: request.url,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          duration: Date.now() - startTime
        };

        return this.handleError(error, enrichedContext);
      }
    };
  }

  // Async operation wrapper
  static async safeExecute(operation, fallback = null, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.logError(error, context);
      return fallback;
    }
  }

  // Database connection wrapper
  static async withDatabase(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      if (error.name === 'MongoError') {
        throw new Error('Database connection failed. Please try again later.');
      }
      throw error;
    }
  }

  // Input validation wrapper
  static validateInput(schema, data, context = {}) {
    try {
      // Add your validation logic here (e.g., using Joi, Yup, or Zod)
      return { valid: true, data };
    } catch (error) {
      this.logError(error, { ...context, validationData: data });
      throw new Error('Invalid input data provided');
    }
  }
}

// Convenience functions
export const createError = (type, details, context) => 
  ServerErrorHandler.createError(type, details, context);

export const handleServerError = (error, context) => 
  ServerErrorHandler.handleError(error, context);

export const withErrorHandling = (handler) => 
  ServerErrorHandler.withErrorHandling(handler);

export const safeExecute = (operation, fallback, context) => 
  ServerErrorHandler.safeExecute(operation, fallback, context);

export const withDatabase = (operation, context) => 
  ServerErrorHandler.withDatabase(operation, context);

export default ServerErrorHandler;