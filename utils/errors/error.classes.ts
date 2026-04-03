import { ErrorSeverity, ErrorTypes } from './error.types';
import type { ErrorSeverityLevel, ErrorType } from './error.types';

export class AppError extends Error {
  public type: ErrorType;
  public severity: ErrorSeverityLevel;
  public statusCode: number;
  public details: unknown;
  public timestamp: Date;
  public requestId: string | null;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverityLevel = ErrorSeverity.MEDIUM,
    statusCode = 500,
    details: unknown = null
  ) {
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

export class ValidationError extends AppError {
  constructor(message: string, details: unknown = null) {
    super(message, ErrorTypes.VALIDATION, ErrorSeverity.LOW, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ErrorTypes.AUTHENTICATION, ErrorSeverity.MEDIUM, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, ErrorTypes.AUTHORIZATION, ErrorSeverity.MEDIUM, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, ErrorTypes.NOT_FOUND, ErrorSeverity.LOW, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', remainingTime = 0) {
    super(message, ErrorTypes.RATE_LIMIT, ErrorSeverity.MEDIUM, 429, { remainingTime });
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details: unknown = null) {
    super(message, ErrorTypes.DATABASE, ErrorSeverity.HIGH, 500, details);
    this.name = 'DatabaseError';
  }
}

export class ExternalAPIError extends AppError {
  constructor(message = 'External API error', details: unknown = null) {
    super(message, ErrorTypes.EXTERNAL_API, ErrorSeverity.MEDIUM, 502, details);
    this.name = 'ExternalAPIError';
  }
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message || 'Internal server error',
      ErrorTypes.INTERNAL,
      ErrorSeverity.HIGH,
      500
    );
  }

  return new AppError('Internal server error', ErrorTypes.INTERNAL, ErrorSeverity.HIGH, 500);
}
