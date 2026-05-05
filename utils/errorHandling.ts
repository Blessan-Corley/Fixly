import { NextResponse } from 'next/server';

import { env } from '@/lib/env';

import { normalizeError } from './errors/error.classes';
import type { AppError } from './errors/error.classes';
import { errorLogger } from './errors/error.logger';
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
export {
  handleDatabaseError,
  handleAuthError,
  handleRateLimitError,
  handleFileUploadError,
  handlePaymentError,
} from './errorHandling.handlers';

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
