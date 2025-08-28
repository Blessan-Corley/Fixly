import { NextResponse } from 'next/server';

// Standardized error codes
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ADMIN_ACCESS_REQUIRED: 'ADMIN_ACCESS_REQUIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Business Logic
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  
  // File Upload
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
};

// HTTP status code mappings
const STATUS_CODES = {
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.SESSION_EXPIRED]: 401,
  [ERROR_CODES.ADMIN_ACCESS_REQUIRED]: 403,
  
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
  [ERROR_CODES.INVALID_FORMAT]: 400,
  
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.USER_NOT_FOUND]: 404,
  [ERROR_CODES.JOB_NOT_FOUND]: 404,
  [ERROR_CODES.ALREADY_EXISTS]: 409,
  
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.QUOTA_EXCEEDED]: 429,
  [ERROR_CODES.TOO_MANY_ATTEMPTS]: 429,
  
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502,
  
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 403,
  [ERROR_CODES.CONFLICT]: 409,
  
  [ERROR_CODES.FILE_TOO_LARGE]: 413,
  [ERROR_CODES.INVALID_FILE_TYPE]: 400,
  [ERROR_CODES.UPLOAD_FAILED]: 500
};

// Performance monitoring
const requestMetrics = {
  totalRequests: 0,
  errorCount: 0,
  responseTimeSum: 0,
  lastReset: Date.now()
};

// Success response builder
export function ApiSuccess(data = null, message = 'Success', meta = {}) {
  requestMetrics.totalRequests++;
  
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...(Object.keys(meta).length > 0 && { meta })
  };
  
  return NextResponse.json(response, {
    status: 200,
    headers: {
      'X-API-Version': '1.0',
      'X-Request-ID': generateRequestId()
    }
  });
}

// Error response builder
export function ApiError(errorCode, message = null, details = null, statusCode = null) {
  requestMetrics.totalRequests++;
  requestMetrics.errorCount++;
  
  const status = statusCode || STATUS_CODES[errorCode] || 500;
  const defaultMessage = getDefaultMessage(errorCode);
  
  const response = {
    success: false,
    error: errorCode,
    message: message || defaultMessage,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: new Error().stack 
    })
  };
  
  // Log errors (exclude client errors from logs)
  if (status >= 500) {
    console.error('API Error:', {
      errorCode,
      message: message || defaultMessage,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
  
  return NextResponse.json(response, {
    status,
    headers: {
      'X-API-Version': '1.0',
      'X-Request-ID': generateRequestId()
    }
  });
}

// Validation error response
export function ApiValidationError(errors) {
  return ApiError(
    ERROR_CODES.VALIDATION_ERROR, 
    'Validation failed', 
    { fields: errors }
  );
}

// Pagination response builder
export function ApiPagination(data, pagination, message = 'Success') {
  return ApiSuccess(data, message, { pagination });
}

// Default error messages
function getDefaultMessage(errorCode) {
  const messages = {
    [ERROR_CODES.UNAUTHORIZED]: 'Authentication required',
    [ERROR_CODES.FORBIDDEN]: 'Access forbidden',
    [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials',
    [ERROR_CODES.SESSION_EXPIRED]: 'Session has expired',
    [ERROR_CODES.ADMIN_ACCESS_REQUIRED]: 'Admin access required',
    
    [ERROR_CODES.VALIDATION_ERROR]: 'Validation failed',
    [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
    [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing',
    [ERROR_CODES.INVALID_FORMAT]: 'Invalid format',
    
    [ERROR_CODES.NOT_FOUND]: 'Resource not found',
    [ERROR_CODES.USER_NOT_FOUND]: 'User not found',
    [ERROR_CODES.JOB_NOT_FOUND]: 'Job not found',
    [ERROR_CODES.ALREADY_EXISTS]: 'Resource already exists',
    
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
    [ERROR_CODES.QUOTA_EXCEEDED]: 'Quota exceeded',
    [ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many attempts',
    
    [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
    [ERROR_CODES.DATABASE_ERROR]: 'Database error',
    [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service error',
    
    [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
    [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'Operation not allowed',
    [ERROR_CODES.CONFLICT]: 'Conflict occurred',
    
    [ERROR_CODES.FILE_TOO_LARGE]: 'File too large',
    [ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type',
    [ERROR_CODES.UPLOAD_FAILED]: 'Upload failed'
  };
  
  return messages[errorCode] || 'An error occurred';
}

// Generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware wrapper for error handling
export function withErrorHandler(handler) {
  return async function wrappedHandler(request, context) {
    const startTime = Date.now();
    
    try {
      const result = await handler(request, context);
      
      // Track response time
      const responseTime = Date.now() - startTime;
      requestMetrics.responseTimeSum += responseTime;
      
      return result;
    } catch (error) {
      console.error('Unhandled API error:', {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        timestamp: new Date().toISOString()
      });
      
      // Return standardized error response
      if (error.name === 'ValidationError') {
        return ApiValidationError(error.errors);
      } else if (error.name === 'CastError') {
        return ApiError(ERROR_CODES.INVALID_INPUT, 'Invalid ID format');
      } else if (error.code === 11000) {
        return ApiError(ERROR_CODES.ALREADY_EXISTS, 'Resource already exists');
      } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
        return ApiError(ERROR_CODES.DATABASE_ERROR, 'Database operation failed');
      } else {
        return ApiError(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred');
      }
    }
  };
}

// Get API metrics
export function getApiMetrics() {
  const now = Date.now();
  const timeSinceReset = now - requestMetrics.lastReset;
  const avgResponseTime = requestMetrics.totalRequests > 0 
    ? requestMetrics.responseTimeSum / requestMetrics.totalRequests 
    : 0;
    
  return {
    totalRequests: requestMetrics.totalRequests,
    errorCount: requestMetrics.errorCount,
    errorRate: requestMetrics.totalRequests > 0 
      ? (requestMetrics.errorCount / requestMetrics.totalRequests * 100).toFixed(2) + '%'
      : '0%',
    avgResponseTime: Math.round(avgResponseTime),
    uptime: Math.round(timeSinceReset / 1000),
    timestamp: new Date().toISOString()
  };
}

// Reset metrics (call periodically)
export function resetMetrics() {
  requestMetrics.totalRequests = 0;
  requestMetrics.errorCount = 0;
  requestMetrics.responseTimeSum = 0;
  requestMetrics.lastReset = Date.now();
}

// Validation helper
export function validateRequired(data, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!data[field] && data[field] !== 0 && data[field] !== false) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

// Input sanitization
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>\"'&]/g, (char) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char];
    });
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}