import { logger } from '@/lib/logger';

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  RateLimitError,
  ValidationError,
} from './errors/error.classes';
import { ErrorSeverity, ErrorTypes } from './errors/error.types';

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
