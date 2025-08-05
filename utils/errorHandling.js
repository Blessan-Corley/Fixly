// utils/errorHandling.js - Centralized error handling system
import { NextResponse } from 'next/server';

// Error types
const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  FILE_UPLOAD: 'FILE_UPLOAD_ERROR',
  PAYMENT: 'PAYMENT_ERROR',
  INTERNAL: 'INTERNAL_ERROR'
};

// Error severity levels
const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Custom error classes
class AppError extends Error {
  constructor(message, type, severity = ErrorSeverity.MEDIUM, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = null;
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, ErrorTypes.VALIDATION, ErrorSeverity.LOW, 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ErrorTypes.AUTHENTICATION, ErrorSeverity.MEDIUM, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, ErrorTypes.AUTHORIZATION, ErrorSeverity.MEDIUM, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, ErrorTypes.NOT_FOUND, ErrorSeverity.LOW, 404);
    this.name = 'NotFoundError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', remainingTime = 0) {
    super(message, ErrorTypes.RATE_LIMIT, ErrorSeverity.MEDIUM, 429, { remainingTime });
    this.name = 'RateLimitError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, ErrorTypes.DATABASE, ErrorSeverity.HIGH, 500, details);
    this.name = 'DatabaseError';
  }
}

class ExternalAPIError extends AppError {
  constructor(message = 'External API error', details = null) {
    super(message, ErrorTypes.EXTERNAL_API, ErrorSeverity.MEDIUM, 502, details);
    this.name = 'ExternalAPIError';
  }
}

// Error logging
class ErrorLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(error, context = {}) {
    const errorLog = {
      id: this.generateId(),
      timestamp: new Date(),
      type: error.type || 'UNKNOWN',
      severity: error.severity || ErrorSeverity.MEDIUM,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      requestId: error.requestId,
      userAgent: context.userAgent,
      ip: context.ip,
      url: context.url,
      method: context.method,
      userId: context.userId,
      details: error.details
    };

    this.logs.unshift(errorLog);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console logging based on severity
    this.consoleLog(errorLog);

    return errorLog;
  }

  generateId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  consoleLog(errorLog) {
    const timestamp = errorLog.timestamp.toISOString();
    const prefix = `[${timestamp}] [${errorLog.severity}] [${errorLog.type}]`;
    
    switch (errorLog.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(`${prefix} CRITICAL: ${errorLog.message}`, errorLog);
        break;
      case ErrorSeverity.HIGH:
        console.error(`${prefix} HIGH: ${errorLog.message}`, errorLog);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(`${prefix} MEDIUM: ${errorLog.message}`, errorLog);
        break;
      case ErrorSeverity.LOW:
        console.log(`${prefix} LOW: ${errorLog.message}`, errorLog);
        break;
    }
  }

  getLogs(limit = 100, severity = null) {
    let filteredLogs = this.logs;
    
    if (severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === severity);
    }
    
    return filteredLogs.slice(0, limit);
  }

  getErrorStats() {
    const stats = {
      total: this.logs.length,
      byType: {},
      bySeverity: {},
      recent: this.logs.slice(0, 10)
    };

    this.logs.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    });

    return stats;
  }

  clearLogs() {
    this.logs = [];
  }
}

// Global error logger instance
const errorLogger = new ErrorLogger();

// Error response formatter
function formatErrorResponse(error, includeDetails = false) {
  const response = {
    error: true,
    message: error.message,
    type: error.type,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    requestId: error.requestId
  };

  if (includeDetails && error.details) {
    response.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

// Error handling middleware
function withErrorHandling(handler) {
  return async function errorHandlingWrapper(request, context) {
    try {
      // Add request context
      const context = {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        url: request.url,
        method: request.method,
        userId: null // Will be set if user is authenticated
      };

      // Execute the handler
      const response = await handler(request, context);

      // Add security headers
      if (response instanceof Response) {
        addSecurityHeaders(response);
      }

      return response;
    } catch (error) {
      // Log the error
      const errorLog = errorLogger.log(error, context);

      // Format error response
      const errorResponse = formatErrorResponse(error, process.env.NODE_ENV === 'development');

      // Return appropriate HTTP response
      return NextResponse.json(
        errorResponse,
        { 
          status: error.statusCode || 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': errorLog.id
          }
        }
      );
    }
  };
}

// Security headers function
function addSecurityHeaders(response) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

// Database error handler
function handleDatabaseError(error, operation = 'unknown') {
  console.error(`Database error in ${operation}:`, error);

  if (error.name === 'ValidationError') {
    return new ValidationError('Data validation failed', error.message);
  }

  if (error.name === 'CastError') {
    return new ValidationError('Invalid data format');
  }

  if (error.code === 11000) {
    return new ValidationError('Duplicate entry found');
  }

  if (error.name === 'MongoNetworkError') {
    return new DatabaseError('Database connection failed');
  }

  return new DatabaseError('Database operation failed', error.message);
}

// Authentication error handler
function handleAuthError(error, context = 'authentication') {
  console.error(`Authentication error in ${context}:`, error);

  if (error.message.includes('password')) {
    return new AuthenticationError('Invalid credentials');
  }

  if (error.message.includes('banned')) {
    return new AuthorizationError('Account suspended');
  }

  if (error.message.includes('inactive')) {
    return new AuthorizationError('Account inactive');
  }

  return new AuthenticationError('Authentication failed');
}

// Rate limit error handler
function handleRateLimitError(error, remainingTime = 0) {
  return new RateLimitError(error.message, remainingTime);
}

// File upload error handler
function handleFileUploadError(error) {
  if (error.message.includes('size')) {
    return new ValidationError('File too large');
  }

  if (error.message.includes('type')) {
    return new ValidationError('Invalid file type');
  }

  return new AppError('File upload failed', ErrorTypes.FILE_UPLOAD, ErrorSeverity.MEDIUM, 400);
}

// Payment error handler
function handlePaymentError(error) {
  if (error.message.includes('insufficient')) {
    return new ValidationError('Insufficient funds');
  }

  if (error.message.includes('expired')) {
    return new ValidationError('Payment method expired');
  }

  return new AppError('Payment processing failed', ErrorTypes.PAYMENT, ErrorSeverity.HIGH, 400);
}

// Async error wrapper
function asyncHandler(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      // Convert to AppError if not already
      if (!(error instanceof AppError)) {
        error = new AppError(
          error.message || 'Internal server error',
          ErrorTypes.INTERNAL,
          ErrorSeverity.HIGH,
          error.statusCode || 500
        );
      }

      throw error;
    }
  };
}

// Error monitoring (for production)
class ErrorMonitor {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }

  captureError(error, context = {}) {
    const errorInfo = {
      id: this.generateId(),
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: error.type,
        severity: error.severity,
        statusCode: error.statusCode
      },
      context,
      userAgent: context.userAgent,
      ip: context.ip,
      url: context.url,
      userId: context.userId
    };

    this.errors.unshift(errorInfo);

    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // In production, send to external monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorInfo);
    }

    return errorInfo;
  }

  generateId() {
    return `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sendToMonitoringService(errorInfo) {
    // Implement integration with external monitoring services
    // like Sentry, LogRocket, etc.
    console.log('Sending error to monitoring service:', errorInfo.id);
  }

  getErrorReport() {
    return {
      totalErrors: this.errors.length,
      recentErrors: this.errors.slice(0, 10),
      errorTypes: this.errors.reduce((acc, error) => {
        acc[error.error.type] = (acc[error.error.type] || 0) + 1;
        return acc;
      }, {}),
      severityBreakdown: this.errors.reduce((acc, error) => {
        acc[error.error.severity] = (acc[error.error.severity] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

// Global error monitor instance
const errorMonitor = new ErrorMonitor();

// Export error handling utilities
export {
  ErrorTypes,
  ErrorSeverity,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  ExternalAPIError,
  errorLogger,
  formatErrorResponse,
  withErrorHandling,
  handleDatabaseError,
  handleAuthError,
  handleRateLimitError,
  handleFileUploadError,
  handlePaymentError,
  asyncHandler,
  ErrorMonitor,
  errorMonitor
}; 