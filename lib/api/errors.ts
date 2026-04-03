import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { logger } from '@/lib/logger';

import { apiError, apiInternalError, apiValidationError } from './response';

type MongooseValidationError = Error & {
  name?: string;
};

export class AppError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super('CONFLICT', message, 409);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required') {
    super('PAYMENT_REQUIRED', message, 402);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super('INTERNAL_ERROR', message, 500);
  }
}

function isMongooseValidationError(error: unknown): error is MongooseValidationError {
  return error instanceof Error && (error as MongooseValidationError).name === 'ValidationError';
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return apiError(error.code, error.message, error.status, error.details);
  }

  if (error instanceof ZodError) {
    return apiValidationError(error.flatten());
  }

  if (isMongooseValidationError(error)) {
    return apiValidationError(error.message);
  }

  logger.error({ error }, 'Unhandled route error');
  return apiInternalError();
}
