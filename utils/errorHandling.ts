import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  RateLimitError,
  ValidationError,
  normalizeError,
} from './errors/error.classes';
import { errorLogger } from './errors/error.logger';
import { ErrorSeverity, ErrorTypes } from './errors/error.types';
import type { AppErrorResponse, RequestContext } from './errors/error.types';

// Re-export everything so existing import paths keep working
export { ErrorTypes, ErrorSeverity } from './errors/error.types';
export type { RequestContext } from './errors/error.types';
export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ExternalAPIError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  normalizeError,
} from './errors/error.classes';
export { errorLogger } from './errors/error.logger';
export { errorMonitor } from './errors/error.monitor';

export function formatErrorResponse(error: AppError, includeDetails = false): AppErrorResponse {
  const response: AppErrorResponse = {
    error: true,
    message: error.message,
    type: error.type,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    requestId: error.requestId,
  };

  if (includeDetails && error.details) {
    response.details = error.details;
  }

  if (env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

export function withErrorHandling<TContext = unknown>(
  handler: (request: Request, context: TContext) => Promise<Response> | Response
) {
  return async function errorHandlingWrapper(request: Request, context: TContext) {
    const requestContext: RequestContext = {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      url: request.url,
      method: request.method,
      userId: null,
    };

    try {
      const response = await handler(request, context);
      if (response instanceof Response) {
        addSecurityHeaders(response);
      }
      return response;
    } catch (error) {
      const appError = normalizeError(error);
      const errorLog = errorLogger.log(appError, requestContext);
      appError.requestId = errorLog.id;

      const errorResponse = formatErrorResponse(appError, env.NODE_ENV === 'development');

      return NextResponse.json(errorResponse, {
        status: appError.statusCode || 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': errorLog.id,
        },
      });
    }
  };
}

export function addSecurityHeaders(response: Response): Response {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export function handleDatabaseError(
  error: unknown,
  operation = 'unknown'
): DatabaseError | ValidationError {
  logger.error(`Database error in ${operation}:`, error);

  const err = error as { name?: string; message?: string; code?: number };

  if (err?.name === 'ValidationError') return new ValidationError('Data validation failed', err.message);
  if (err?.name === 'CastError') return new ValidationError('Invalid data format');
  if (err?.code === 11000) return new ValidationError('Duplicate entry found');
  if (err?.name === 'MongoNetworkError') return new DatabaseError('Database connection failed');

  return new DatabaseError('Database operation failed', err?.message ?? null);
}

export function handleAuthError(
  error: unknown,
  context = 'authentication'
): AuthenticationError | AuthorizationError {
  logger.error(`Authentication error in ${context}:`, error);

  const message = error instanceof Error ? error.message : '';

  if (message.includes('password')) return new AuthenticationError('Invalid credentials');
  if (message.includes('banned')) return new AuthorizationError('Account suspended');
  if (message.includes('inactive')) return new AuthorizationError('Account inactive');

  return new AuthenticationError('Authentication failed');
}

export function handleRateLimitError(error: Error, remainingTime = 0): RateLimitError {
  return new RateLimitError(error.message, remainingTime);
}

export function handleFileUploadError(error: Error): ValidationError | AppError {
  if (error.message.includes('size')) return new ValidationError('File too large');
  if (error.message.includes('type')) return new ValidationError('Invalid file type');

  return new AppError('File upload failed', ErrorTypes.FILE_UPLOAD, ErrorSeverity.MEDIUM, 400);
}

export function handlePaymentError(error: Error): ValidationError | AppError {
  if (error.message.includes('insufficient')) return new ValidationError('Insufficient funds');
  if (error.message.includes('expired')) return new ValidationError('Payment method expired');

  return new AppError('Payment processing failed', ErrorTypes.PAYMENT, ErrorSeverity.HIGH, 400);
}

export function asyncHandler<TContext = unknown>(
  handler: (request: Request, context: TContext) => Promise<Response> | Response
) {
  return async (request: Request, context: TContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      throw normalizeError(error);
    }
  };
}
