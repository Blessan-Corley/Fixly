/**
 * Request Validation Middleware
 * Schema-based validation for API routes
 * Provides automatic error responses and type safety
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // ObjectId validation
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),

  // Email validation
  email: z.string().email('Invalid email format'),

  // Username validation
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),

  // Phone validation (Indian format)
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid phone number format'),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10)
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
};

/**
 * Job-related validation schemas
 */
export const jobSchemas = {
  // Create job
  createJob: z.object({
    title: z.string()
      .min(10, 'Title must be at least 10 characters')
      .max(100, 'Title must be at most 100 characters'),

    description: z.string()
      .min(50, 'Description must be at least 50 characters')
      .max(5000, 'Description must be at most 5000 characters'),

    skillsRequired: z.array(z.string())
      .min(1, 'At least one skill is required')
      .max(10, 'Maximum 10 skills allowed'),

    budget: z.object({
      type: z.enum(['fixed', 'hourly', 'negotiable']),
      amount: z.number().positive().optional(),
      materialsIncluded: z.boolean().default(false)
    }),

    location: z.object({
      address: z.string().min(5, 'Address must be at least 5 characters'),
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional()
    }),

    deadline: z.string().datetime('Invalid deadline format'),
    urgency: z.enum(['flexible', 'moderate', 'urgent']).default('flexible'),
    type: z.enum(['one-time', 'recurring']).default('one-time'),
    experienceLevel: z.enum(['beginner', 'intermediate', 'expert']).default('intermediate')
  }),

  // Update job
  updateJob: z.object({
    title: z.string().min(10).max(100).optional(),
    description: z.string().min(50).max(5000).optional(),
    skillsRequired: z.array(z.string()).min(1).max(10).optional(),
    budget: z.object({
      type: z.enum(['fixed', 'hourly', 'negotiable']),
      amount: z.number().positive().optional(),
      materialsIncluded: z.boolean().optional()
    }).optional(),
    deadline: z.string().datetime().optional(),
    urgency: z.enum(['flexible', 'moderate', 'urgent']).optional()
  }),

  // Job application
  jobApplication: z.object({
    proposedAmount: z.number()
      .positive('Proposed amount must be positive')
      .min(100, 'Minimum amount is ₹100'),

    coverLetter: z.string()
      .min(50, 'Cover letter must be at least 50 characters')
      .max(1000, 'Cover letter must be at most 1000 characters'),

    workPlan: z.string()
      .min(100, 'Work plan must be at least 100 characters')
      .max(2000, 'Work plan must be at most 2000 characters')
      .optional(),

    timeEstimate: z.object({
      value: z.number().positive(),
      unit: z.enum(['hours', 'days', 'weeks'])
    }).optional(),

    materialsIncluded: z.boolean().default(false)
  })
};

/**
 * User-related validation schemas
 */
export const userSchemas = {
  // Update profile
  updateProfile: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
    bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
    phone: commonSchemas.phone.optional(),
    skills: z.array(z.string()).max(20, 'Maximum 20 skills allowed').optional(),
    location: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().regex(/^\d{6}$/).optional()
    }).optional(),
    hourlyRate: z.number().positive().optional(),
    availability: z.enum(['available', 'busy', 'unavailable']).optional()
  }),

  // Settings update
  updateSettings: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional()
    }).optional(),
    privacy: z.object({
      showEmail: z.boolean().optional(),
      showPhone: z.boolean().optional(),
      showLocation: z.boolean().optional()
    }).optional()
  })
};

/**
 * Review/Rating validation schemas
 */
export const reviewSchemas = {
  createReview: z.object({
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
    review: z.string()
      .min(20, 'Review must be at least 20 characters')
      .max(1000, 'Review must be at most 1000 characters'),
    categories: z.object({
      communication: z.number().int().min(1).max(5).optional(),
      quality: z.number().int().min(1).max(5).optional(),
      timeliness: z.number().int().min(1).max(5).optional(),
      professionalism: z.number().int().min(1).max(5).optional()
    }).optional()
  })
};

/**
 * Validate request body against schema
 *
 * @param {Request} request - Next.js request object
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export async function validateRequestBody(request, schema) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: formatZodError(result.error)
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: 'Invalid JSON in request body',
        details: error.message
      }
    };
  }
}

/**
 * Validate query parameters against schema
 *
 * @param {Request} request - Next.js request object
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Object} Validated query parameters
 */
export function validateQueryParams(request, schema) {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error)
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * Validate route parameters (path params)
 *
 * @param {Object} params - Route parameters
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Object} Validation result
 */
export function validateParams(params, schema) {
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: formatZodError(result.error)
    };
  }

  return {
    success: true,
    data: result.data
  };
}

/**
 * Format Zod validation errors for API responses
 */
function formatZodError(error) {
  const formattedErrors = {};

  error.errors.forEach(err => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });

  return {
    message: 'Validation failed',
    errors: formattedErrors,
    details: error.errors
  };
}

/**
 * Middleware wrapper for API routes with validation
 *
 * @param {Function} handler - API route handler
 * @param {Object} schemas - Validation schemas for different parts
 * @returns {Function} Wrapped handler
 *
 * @example
 * async function handler(request, { validatedBody, validatedParams }) {
 *   // Use validated data
 *   return NextResponse.json({ success: true });
 * }
 *
 * export const POST = withValidation(handler, {
 *   body: jobSchemas.createJob,
 *   params: z.object({ jobId: commonSchemas.objectId })
 * });
 */
export function withValidation(handler, schemas = {}) {
  return async (request, context = {}) => {
    const validated = {};

    // Validate body if schema provided
    if (schemas.body) {
      const bodyValidation = await validateRequestBody(request, schemas.body);
      if (!bodyValidation.success) {
        return NextResponse.json(
          {
            success: false,
            ...bodyValidation.error
          },
          { status: 400 }
        );
      }
      validated.body = bodyValidation.data;
    }

    // Validate query params if schema provided
    if (schemas.query) {
      const queryValidation = validateQueryParams(request, schemas.query);
      if (!queryValidation.success) {
        return NextResponse.json(
          {
            success: false,
            ...queryValidation.error
          },
          { status: 400 }
        );
      }
      validated.query = queryValidation.data;
    }

    // Validate route params if schema provided
    if (schemas.params && context.params) {
      const paramsValidation = validateParams(context.params, schemas.params);
      if (!paramsValidation.success) {
        return NextResponse.json(
          {
            success: false,
            ...paramsValidation.error
          },
          { status: 400 }
        );
      }
      validated.params = paramsValidation.data;
    }

    // Call original handler with validated data
    return handler(request, {
      ...context,
      validated
    });
  };
}

/**
 * Custom validators
 */
export const customValidators = {
  // Check if date is in future
  futureDate: (date) => new Date(date) > new Date(),

  // Check if string contains no profanity (basic check)
  cleanText: (text) => {
    const profanityPattern = /\b(badword1|badword2)\b/gi;
    return !profanityPattern.test(text);
  },

  // Check if file size is within limit
  fileSize: (size, maxSizeMB = 5) => {
    return size <= maxSizeMB * 1024 * 1024;
  },

  // Check if string contains personal info (basic check)
  noPersonalInfo: (text) => {
    const patterns = [
      /\b\d{10}\b/, // Phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/ // Phone with separators
    ];
    return !patterns.some(pattern => pattern.test(text));
  }
};

/**
 * Sanitization helpers
 */
export const sanitize = {
  // Remove HTML tags
  stripHtml: (text) => text.replace(/<[^>]*>/g, ''),

  // Trim whitespace
  trim: (text) => text.trim(),

  // Normalize whitespace
  normalizeWhitespace: (text) => text.replace(/\s+/g, ' ').trim(),

  // Remove special characters except allowed ones
  alphanumeric: (text, allowed = '') => {
    const pattern = new RegExp(`[^a-zA-Z0-9${allowed}]`, 'g');
    return text.replace(pattern, '');
  }
};

export default {
  commonSchemas,
  jobSchemas,
  userSchemas,
  reviewSchemas,
  validateRequestBody,
  validateQueryParams,
  validateParams,
  withValidation,
  customValidators,
  sanitize
};
