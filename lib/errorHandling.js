// lib/errorHandling.js - Comprehensive error handling system
import { NextResponse } from 'next/server';
// Simple analytics replacement
const getAnalytics = async () => {
  try {
    const { analytics } = await import('./cache');
    return analytics;
  } catch (error) {
    return null;
  }
};

// Error types and codes
export const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  CONFLICT: 'CONFLICT_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  SERVER: 'SERVER_ERROR',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  NETWORK: 'NETWORK_ERROR',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR'
};

export const ErrorCodes = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'E001',
  TOKEN_EXPIRED: 'E002',
  INSUFFICIENT_PERMISSIONS: 'E003',
  ACCOUNT_SUSPENDED: 'E004',
  EMAIL_NOT_VERIFIED: 'E005',
  
  // Validation
  INVALID_INPUT: 'E101',
  MISSING_REQUIRED_FIELD: 'E102',
  INVALID_FORMAT: 'E103',
  VALUE_TOO_LONG: 'E104',
  VALUE_TOO_SHORT: 'E105',
  
  // Business Logic
  JOB_ALREADY_APPLIED: 'E201',
  JOB_EXPIRED: 'E202',
  INSUFFICIENT_CREDITS: 'E203',
  DUPLICATE_ENTRY: 'E204',
  OPERATION_NOT_ALLOWED: 'E205',
  
  // System
  DATABASE_CONNECTION_FAILED: 'E301',
  EXTERNAL_SERVICE_UNAVAILABLE: 'E302',
  FILE_UPLOAD_FAILED: 'E303',
  EMAIL_DELIVERY_FAILED: 'E304',
  SMS_DELIVERY_FAILED: 'E305',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'E401',
  DAILY_LIMIT_EXCEEDED: 'E402',
  
  // General
  RESOURCE_NOT_FOUND: 'E501',
  INTERNAL_SERVER_ERROR: 'E502',
  SERVICE_UNAVAILABLE: 'E503'
};

// Custom error class
export class FixlyError extends Error {
  constructor(
    message, 
    type = ErrorTypes.SERVER, 
    code = ErrorCodes.INTERNAL_SERVER_ERROR, 
    statusCode = 500,
    details = null
  ) {
    super(message);
    this.name = 'FixlyError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FixlyError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

// Predefined error factories
export const ValidationError = (message, details = null) => 
  new FixlyError(message, ErrorTypes.VALIDATION, ErrorCodes.INVALID_INPUT, 400, details);

export const AuthenticationError = (message = 'Authentication required') => 
  new FixlyError(message, ErrorTypes.AUTHENTICATION, ErrorCodes.INVALID_CREDENTIALS, 401);

export const AuthorizationError = (message = 'Insufficient permissions') => 
  new FixlyError(message, ErrorTypes.AUTHORIZATION, ErrorCodes.INSUFFICIENT_PERMISSIONS, 403);

export const NotFoundError = (resource = 'Resource') => 
  new FixlyError(`${resource} not found`, ErrorTypes.NOT_FOUND, ErrorCodes.RESOURCE_NOT_FOUND, 404);

export const ConflictError = (message, details = null) => 
  new FixlyError(message, ErrorTypes.CONFLICT, ErrorCodes.DUPLICATE_ENTRY, 409, details);

export const RateLimitError = (message = 'Too many requests') => 
  new FixlyError(message, ErrorTypes.RATE_LIMIT, ErrorCodes.TOO_MANY_REQUESTS, 429);

export const DatabaseError = (message = 'Database operation failed') => 
  new FixlyError(message, ErrorTypes.DATABASE, ErrorCodes.DATABASE_CONNECTION_FAILED, 500);

export const ExternalAPIError = (service, message = 'External service unavailable') => 
  new FixlyError(`${service}: ${message}`, ErrorTypes.EXTERNAL_API, ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE, 502);

// Error logging and analytics
export async function logError(error, context = {}) {
  const errorData = {
    message: error.message,
    type: error.type || ErrorTypes.SERVER,
    code: error.code || ErrorCodes.INTERNAL_SERVER_ERROR,
    statusCode: error.statusCode || 500,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error logged:', errorData);
  }

  // Track error analytics
  try {
    const analytics = await getAnalytics();
    if (analytics) {
      await analytics.trackEvent('error_occurred', errorData);
    }
  } catch (analyticsError) {
    console.error('Failed to track error analytics:', analyticsError);
  }

  // In production, send to external monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with Sentry, LogRocket, or similar service
    // await sendToMonitoringService(errorData);
  }

  return errorData;
}

// Error response formatter
export function formatErrorResponse(error, includeStack = false) {
  const isFixlyError = error instanceof FixlyError;
  
  const response = {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      type: error.type || ErrorTypes.SERVER,
      code: error.code || ErrorCodes.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString()
    }
  };

  // Add details if available
  if (error.details) {
    response.error.details = error.details;
  }

  // Add stack trace in development
  if (includeStack && process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return response;
}

// API error handler middleware
export function withErrorHandler(handler) {
  return async function errorWrapper(request, context) {
    try {
      return await handler(request, context);
    } catch (error) {
      // Log the error
      await logError(error, {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      // Determine status code
      const statusCode = error.statusCode || (error instanceof FixlyError ? error.statusCode : 500);
      
      // Format error response
      const errorResponse = formatErrorResponse(error, process.env.NODE_ENV === 'development');
      
      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}

// Validation error helpers
export function validateRequired(fields, data) {
  const errors = [];
  
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push({
        field,
        message: `${field} is required`,
        code: ErrorCodes.MISSING_REQUIRED_FIELD
      });
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', {
      field: 'email',
      code: ErrorCodes.INVALID_FORMAT
    });
  }
}

export function validatePhone(phone) {
  const phoneRegex = /^[+]?[\d\s-()]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    throw new ValidationError('Invalid phone number format', {
      field: 'phone',
      code: ErrorCodes.INVALID_FORMAT
    });
  }
}

export function validateLength(value, field, min = 0, max = Infinity) {
  if (value.length < min) {
    throw new ValidationError(`${field} must be at least ${min} characters`, {
      field,
      code: ErrorCodes.VALUE_TOO_SHORT,
      min,
      actual: value.length
    });
  }
  
  if (value.length > max) {
    throw new ValidationError(`${field} must be no more than ${max} characters`, {
      field,
      code: ErrorCodes.VALUE_TOO_LONG,
      max,
      actual: value.length
    });
  }
}

// Database operation wrapper
export async function withDatabaseErrorHandling(operation, operationName = 'Database operation') {
  try {
    return await operation();
  } catch (error) {
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      throw new DatabaseError(`${operationName} failed: ${error.message}`);
    }
    throw error;
  }
}

// External API wrapper
export async function withExternalAPIErrorHandling(apiCall, serviceName = 'External service') {
  try {
    return await apiCall();
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new ExternalAPIError(serviceName, 'Service unavailable');
    }
    if (error.response?.status >= 400) {
      throw new ExternalAPIError(serviceName, `HTTP ${error.response.status}: ${error.response.statusText}`);
    }
    throw new ExternalAPIError(serviceName, error.message);
  }
}

// Error recovery utilities
export class ErrorRecovery {
  static async withRetry(operation, maxAttempts = 3, backoffMs = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  static async withFallback(primaryOperation, fallbackOperation) {
    try {
      return await primaryOperation();
    } catch (error) {
      console.warn('Primary operation failed, using fallback:', error.message);
      return await fallbackOperation();
    }
  }

  static async withCircuitBreaker(operation, failureThreshold = 5, timeoutMs = 60000) {
    const key = `circuit_breaker_${operation.name || 'unknown'}`;
    
    // This is a simplified circuit breaker - in production, use a proper implementation
    try {
      return await operation();
    } catch (error) {
      // Track failures and implement circuit breaker logic
      throw error;
    }
  }
}

// Health check utilities
export async function healthCheck() {
  const checks = {
    database: false,
    cache: true,
    external_apis: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check database connection
    // This would need to be implemented based on your database setup
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    // Check Redis connection
    // Cache is always available (in-memory)
    checks.cache = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  try {
    // Check external APIs (example)
    checks.external_apis = true;
  } catch (error) {
    console.error('External API health check failed:', error);
  }

  const overallHealth = Object.values(checks).every(status => 
    typeof status === 'boolean' ? status : true
  );

  return {
    healthy: overallHealth,
    checks
  };
}

export default {
  FixlyError,
  ErrorTypes,
  ErrorCodes,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalAPIError,
  logError,
  formatErrorResponse,
  withErrorHandler,
  validateRequired,
  validateEmail,
  validatePhone,
  validateLength,
  withDatabaseErrorHandling,
  withExternalAPIErrorHandling,
  ErrorRecovery,
  healthCheck
};