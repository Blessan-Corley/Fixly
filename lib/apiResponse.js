// lib/apiResponse.js - Standardized API Response Helper
import { NextResponse } from 'next/server';

/**
 * Success response with standardized format
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code (default: 200)
 * @returns {NextResponse}
 */
export function successResponse(data = {}, message = 'Success', status = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Error response with standardized format
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default: 400)
 * @param {Object} details - Additional error details
 * @param {Array} errors - Validation errors array
 * @returns {NextResponse}
 */
export function errorResponse(message = 'An error occurred', status = 400, details = {}, errors = []) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  // Only add details if provided
  if (Object.keys(details).length > 0) {
    response.details = details;
  }

  // Only add errors array if provided
  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return NextResponse.json(response, { status });
}

/**
 * Validation error response
 * @param {Array} errors - Array of validation errors
 * @param {string} message - Error message
 * @returns {NextResponse}
 */
export function validationErrorResponse(errors = [], message = 'Validation failed') {
  return errorResponse(message, 400, {}, errors);
}

/**
 * Unauthorized error response
 * @param {string} message - Error message
 * @returns {NextResponse}
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return errorResponse(message, 401);
}

/**
 * Forbidden error response
 * @param {string} message - Error message
 * @returns {NextResponse}
 */
export function forbiddenResponse(message = 'Access denied') {
  return errorResponse(message, 403);
}

/**
 * Not found error response
 * @param {string} message - Error message
 * @returns {NextResponse}
 */
export function notFoundResponse(message = 'Resource not found') {
  return errorResponse(message, 404);
}

/**
 * Rate limit error response
 * @param {Object} rateLimitInfo - Rate limit details
 * @returns {NextResponse}
 */
export function rateLimitResponse(rateLimitInfo = {}) {
  return errorResponse(
    'Too many requests. Please try again later.',
    429,
    {
      resetTime: rateLimitInfo.resetTime,
      remaining: rateLimitInfo.remaining,
      retryAfter: rateLimitInfo.retryAfter
    }
  );
}

/**
 * Server error response
 * @param {string} message - Error message
 * @param {Error} error - Error object (will be logged, not exposed)
 * @returns {NextResponse}
 */
export function serverErrorResponse(message = 'Internal server error', error = null) {
  // Log error for debugging (not exposed to client)
  if (error) {
    console.error('💥 Server error:', error);
  }

  // Generic message for production
  const publicMessage = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : message;

  return errorResponse(publicMessage, 500);
}

/**
 * Conflict error response (e.g., duplicate resource)
 * @param {string} message - Error message
 * @param {Object} details - Conflict details
 * @returns {NextResponse}
 */
export function conflictResponse(message = 'Resource already exists', details = {}) {
  return errorResponse(message, 409, details);
}

export default {
  success: successResponse,
  error: errorResponse,
  validation: validationErrorResponse,
  unauthorized: unauthorizedResponse,
  forbidden: forbiddenResponse,
  notFound: notFoundResponse,
  rateLimit: rateLimitResponse,
  serverError: serverErrorResponse,
  conflict: conflictResponse
};
