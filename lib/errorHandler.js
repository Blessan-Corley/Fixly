/**
 * Centralized Error Handling for API Routes
 * Provides consistent error responses and logging
 */

import { NextResponse } from 'next/server';

/**
 * Standard error response format
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'APIError';
  }
}

/**
 * Pre-defined error types
 */
export const ErrorTypes = {
  // Authentication & Authorization (401-403)
  UNAUTHORIZED: (message = 'Authentication required') =>
    new APIError(message, 401, 'UNAUTHORIZED'),

  FORBIDDEN: (message = 'Access denied') =>
    new APIError(message, 403, 'FORBIDDEN'),

  INVALID_TOKEN: (message = 'Invalid or expired token') =>
    new APIError(message, 401, 'INVALID_TOKEN'),

  // Validation Errors (400)
  VALIDATION_ERROR: (message = 'Validation failed', details = null) =>
    new APIError(message, 400, 'VALIDATION_ERROR', details),

  MISSING_FIELD: (field) =>
    new APIError(`Missing required field: ${field}`, 400, 'MISSING_FIELD', { field }),

  INVALID_INPUT: (message = 'Invalid input data') =>
    new APIError(message, 400, 'INVALID_INPUT'),

  // Resource Errors (404, 409)
  NOT_FOUND: (resource = 'Resource') =>
    new APIError(`${resource} not found`, 404, 'NOT_FOUND'),

  ALREADY_EXISTS: (resource = 'Resource') =>
    new APIError(`${resource} already exists`, 409, 'ALREADY_EXISTS'),

  DUPLICATE_ENTRY: (field) =>
    new APIError(`Duplicate entry for ${field}`, 409, 'DUPLICATE_ENTRY', { field }),

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: (message = 'Too many requests', remainingTime = null) =>
    new APIError(message, 429, 'RATE_LIMIT_EXCEEDED', { remainingTime }),

  // Business Logic Errors (400, 403)
  INSUFFICIENT_CREDITS: (required, available) =>
    new APIError('Insufficient credits', 403, 'INSUFFICIENT_CREDITS', { required, available }),

  QUOTA_EXCEEDED: (message = 'Quota exceeded') =>
    new APIError(message, 403, 'QUOTA_EXCEEDED'),

  OPERATION_NOT_ALLOWED: (message = 'Operation not allowed') =>
    new APIError(message, 403, 'OPERATION_NOT_ALLOWED'),

  // Server Errors (500+)
  DATABASE_ERROR: (message = 'Database operation failed') =>
    new APIError(message, 500, 'DATABASE_ERROR'),

  EXTERNAL_SERVICE_ERROR: (service, message = 'External service unavailable') =>
    new APIError(message, 503, 'EXTERNAL_SERVICE_ERROR', { service }),

  INTERNAL_ERROR: (message = 'An unexpected error occurred') =>
    new APIError(message, 500, 'INTERNAL_ERROR'),
};

/**
 * Error logger with context
 */
export function logError(error, context = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    code: error.code || 'UNKNOWN_ERROR',
    ...context
  };

  // Log based on severity
  if (error.statusCode >= 500) {
    console.error('🔴 SERVER ERROR:', JSON.stringify(errorLog, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('⚠️ CLIENT ERROR:', JSON.stringify(errorLog, null, 2));
  } else {
    console.log('ℹ️ INFO:', JSON.stringify(errorLog, null, 2));
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production' && error.statusCode >= 500) {
    // TODO: Send to Sentry, LogRocket, or other error tracking
    // Example: Sentry.captureException(error, { extra: context });
  }

  return errorLog;
}

/**
 * Main error handler middleware
 * Wraps API route handlers with try-catch and standardized error responses
 */
export function withErrorHandler(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Log error with context
      const errorContext = {
        method: request.method,
        url: request.url,
        params: context?.params,
        userAgent: request.headers.get('user-agent'),
      };

      logError(error, errorContext);

      // Handle known APIError instances
      if (error instanceof APIError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: error.message,
              code: error.code,
              ...(error.details && { details: error.details })
            }
          },
          { status: error.statusCode }
        );
      }

      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const details = Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }));

        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details
            }
          },
          { status: 400 }
        );
      }

      // Handle Mongoose duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Duplicate entry for ${field}`,
              code: 'DUPLICATE_ENTRY',
              details: { field }
            }
          },
          { status: 409 }
        );
      }

      // Handle Mongoose cast errors
      if (error.name === 'CastError') {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Invalid ${error.path}: ${error.value}`,
              code: 'INVALID_ID'
            }
          },
          { status: 400 }
        );
      }

      // Handle JSON parse errors
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Invalid JSON in request body',
              code: 'INVALID_JSON'
            }
          },
          { status: 400 }
        );
      }

      // Generic server error (don't expose details in production)
      const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message;

      return NextResponse.json(
        {
          success: false,
          error: {
            message,
            code: 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && {
              stack: error.stack
            })
          }
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Async error wrapper for individual functions
 */
export function catchAsync(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error; // Re-throw to be caught by main handler
    }
  };
}

/**
 * Validation helper
 */
export function validateRequired(data, fields) {
  const missing = fields.filter(field => !data[field]);

  if (missing.length > 0) {
    throw ErrorTypes.VALIDATION_ERROR(
      `Missing required fields: ${missing.join(', ')}`,
      { missing }
    );
  }
}

/**
 * Success response helper
 */
export function successResponse(data, message = null, statusCode = 200) {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      ...data
    },
    { status: statusCode }
  );
}

/**
 * Paginated response helper
 */
export function paginatedResponse(data, pagination, message = null) {
  return NextResponse.json(
    {
      success: true,
      ...(message && { message }),
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
        hasMore: pagination.hasMore || false
      }
    },
    { status: 200 }
  );
}

export default {
  APIError,
  ErrorTypes,
  logError,
  withErrorHandler,
  catchAsync,
  validateRequired,
  successResponse,
  paginatedResponse
};
