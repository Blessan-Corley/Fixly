// utils/validation.js - Enhanced security validation utilities
import { NextResponse } from 'next/server';
import { rateLimit } from './rateLimiting';
import validator from 'validator';

// Validation schemas
const validationSchemas = {
  // User registration
  userRegistration: {
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s]+$/
    },
    email: {
      type: 'string',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
      type: 'string',
      required: true,
      validate: (value, data) => {
        // For development or OAuth users, allow any phone number
        if (process.env.NODE_ENV === 'development' || data.authMethod === 'google') {
          return { valid: true };
        }
        // For production, require Indian phone number
        const cleanPhone = value.replace(/\D/g, '');
        const pattern = /^(\+91)?[6-9]\d{9}$/;
        return { 
          valid: pattern.test(cleanPhone),
          error: 'Please enter a valid Indian phone number (10 digits starting with 6-9)'
        };
      }
    },
    password: {
      type: 'string',
      required: (data) => data.authMethod === 'email',
      validate: (value, data) => {
        if (data.authMethod !== 'email') return { valid: true };
        if (!value) return { valid: false, error: 'Password is required for email registration' };
        
        // For development, allow simpler passwords
        if (process.env.NODE_ENV === 'development') {
          return { 
            valid: value.length >= 6,
            error: 'Password must be at least 6 characters'
          };
        }
        
        // For production, require strong passwords
        const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return { 
          valid: pattern.test(value),
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        };
      }
    },
    role: {
      type: 'string',
      required: true,
      enum: ['hirer', 'fixer']
    },
    username: {
      type: 'string',
      required: true,
      validate: (value, data) => {
        return ValidationRules.validateUsername(value);
      }
    },
    location: {
      type: 'object',
      required: false, // Make location optional initially
      properties: {
        city: {
          type: 'string',
          required: false
        },
        state: {
          type: 'string',
          required: false
        }
      }
    },
    skills: {
      type: 'array',
      required: (data) => data.role === 'fixer',
      validate: (value, data) => {
        if (data.role !== 'fixer') return { valid: true };
        if (!Array.isArray(value) || value.length === 0) {
          return { valid: false, error: 'Please select at least one skill' };
        }
        return { valid: true };
      }
    }
  },

  // Job posting
  jobPosting: {
    title: {
      type: 'string',
      required: true,
      minLength: 10,
      maxLength: 100
    },
    description: {
      type: 'string',
      required: true,
      minLength: 30,
      maxLength: 2000
    },
    skillsRequired: {
      type: 'array',
      required: true,
      minLength: 1,
      maxLength: 10,
      items: {
        type: 'string',
        minLength: 2,
        maxLength: 50
      }
    },
    budget: {
      type: 'object',
      required: true,
      properties: {
        type: {
          type: 'string',
          enum: ['fixed', 'negotiable', 'hourly']
        },
        amount: {
          type: 'number',
          min: 0,
          max: 1000000
        },
        currency: {
          type: 'string',
          enum: ['INR', 'USD']
        }
      }
    },
    location: {
      type: 'object',
      required: true,
      properties: {
        address: {
          type: 'string',
          required: true,
          maxLength: 200
        },
        city: {
          type: 'string',
          required: true,
          maxLength: 50
        },
        state: {
          type: 'string',
          required: true,
          maxLength: 50
        },
        pincode: {
          type: 'string',
          pattern: /^[0-9]{6}$/
        }
      }
    },
    deadline: {
      type: 'string',
      required: true
    },
    urgency: {
      type: 'string',
      enum: ['asap', 'flexible', 'scheduled']
    },
    type: {
      type: 'string',
      enum: ['one-time', 'recurring']
    },
    experienceLevel: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'expert']
    }
  },

  // Application submission
  applicationSubmission: {
    proposedAmount: {
      type: 'number',
      required: true,
      min: 0,
      max: 1000000
    },
    timeEstimate: {
      type: 'object',
      required: true,
      properties: {
        value: {
          type: 'number',
          required: true,
          min: 1
        },
        unit: {
          type: 'string',
          enum: ['hours', 'days', 'weeks']
        }
      }
    },
    coverLetter: {
      type: 'string',
      required: true,
      minLength: 50,
      maxLength: 1000
    }
  },

  // Profile update
  profileUpdate: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 50
    },
    bio: {
      type: 'string',
      maxLength: 500
    },
    skills: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 2,
        maxLength: 50
      }
    },
    hourlyRate: {
      type: 'number',
      min: 0,
      max: 10000
    }
  }
};

// Validation functions
function validateString(value, schema) {
  if (schema.required && (!value || value.trim() === '')) {
    return { valid: false, error: `${schema.fieldName || 'Field'} is required` };
  }

  if (value && schema.minLength && value.length < schema.minLength) {
    return { valid: false, error: `${schema.fieldName || 'Field'} must be at least ${schema.minLength} characters` };
  }

  if (value && schema.maxLength && value.length > schema.maxLength) {
    return { valid: false, error: `${schema.fieldName || 'Field'} cannot exceed ${schema.maxLength} characters` };
  }

  if (value && schema.pattern && !schema.pattern.test(value)) {
    return { valid: false, error: `${schema.fieldName || 'Field'} format is invalid` };
  }

  if (value && schema.enum && !schema.enum.includes(value)) {
    return { valid: false, error: `${schema.fieldName || 'Field'} must be one of: ${schema.enum.join(', ')}` };
  }

  return { valid: true };
}

function validateNumber(value, schema) {
  if (schema.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `${schema.fieldName || 'Field'} is required` };
  }

  if (value !== null && value !== undefined && value !== '') {
    const numValue = Number(value);
    
    // Enhanced numeric validation - check for NaN and Infinity
    if (isNaN(numValue) || !isFinite(numValue)) {
      return { valid: false, error: `${schema.fieldName || 'Field'} must be a valid finite number` };
    }
    
    // Prevent injection through scientific notation abuse
    if (typeof value === 'string' && /[eE]/.test(value)) {
      const scientificMatch = value.match(/^-?\d+(\.\d+)?[eE][+-]?\d+$/);
      if (!scientificMatch) {
        return { valid: false, error: `${schema.fieldName || 'Field'} contains invalid scientific notation` };
      }
    }

    if (schema.min !== undefined && numValue < schema.min) {
      return { valid: false, error: `${schema.fieldName || 'Field'} must be at least ${schema.min}` };
    }

    if (schema.max !== undefined && numValue > schema.max) {
      return { valid: false, error: `${schema.fieldName || 'Field'} cannot exceed ${schema.max}` };
    }
  }

  return { valid: true };
}

function validateArray(value, schema) {
  if (schema.required && (!Array.isArray(value) || value.length === 0)) {
    return { valid: false, error: `${schema.fieldName || 'Field'} is required` };
  }

  if (Array.isArray(value)) {
    if (schema.minLength && value.length < schema.minLength) {
      return { valid: false, error: `${schema.fieldName || 'Field'} must have at least ${schema.minLength} items` };
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      return { valid: false, error: `${schema.fieldName || 'Field'} cannot exceed ${schema.maxLength} items` };
    }

    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemValidation = validateValue(value[i], schema.items);
        if (!itemValidation.valid) {
          return { valid: false, error: `Item ${i + 1}: ${itemValidation.error}` };
        }
      }
    }
  }

  return { valid: true };
}

function validateObject(value, schema) {
  if (schema.required && (!value || typeof value !== 'object')) {
    return { valid: false, error: `${schema.fieldName || 'Field'} is required` };
  }

  if (value && typeof value === 'object' && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propValidation = validateValue(value[key], propSchema);
      if (!propValidation.valid) {
        return { valid: false, error: `${key}: ${propValidation.error}` };
      }
    }
  }

  return { valid: true };
}

function validateValue(value, schema, data) {
  // Check if field is required based on condition
  if (typeof schema.required === 'function') {
    if (!schema.required(data)) {
      return { valid: true }; // Skip validation if not required
    }
  } else if (schema.required === false) {
    if (!value) return { valid: true }; // Skip validation if not required and no value
  }

  // Check custom validation if provided
  if (schema.validate) {
    return schema.validate(value, data);
  }

  // Standard type validation
  switch (schema.type) {
    case 'string':
      return validateString(value, schema);
    case 'number':
      return validateNumber(value, schema);
    case 'array':
      return validateArray(value, schema);
    case 'object':
      return validateObject(value, schema);
    default:
      return { valid: true };
  }
}

// Main validation function
export function validateData(data, schemaName) {
  const schema = validationSchemas[schemaName];
  if (!schema) {
    return { valid: false, error: 'Invalid schema name' };
  }

  const errors = [];

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const validation = validateValue(data[field], fieldSchema, data);
    if (!validation.valid) {
      errors.push({ field, error: validation.error });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    validatedData: data // Return the validated data
  };
}

// Enhanced sanitization functions with XSS protection
export function sanitizeString(str, options = {}) {
  if (typeof str !== 'string') return str;
  
  let sanitized = str.trim();
  
  // XSS protection - escape HTML unless explicitly allowed
  if (!options.allowHtml) {
    sanitized = validator.escape(sanitized);
  }
  
  // Remove potentially dangerous characters
  if (options.strict) {
    sanitized = sanitized.replace(/[<>"'&\\]/g, '');
  }
  
  return sanitized;
}

export function sanitizeEmail(email) {
  if (typeof email !== 'string') return email;
  return email.toLowerCase().trim();
}

export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return phone;
  return phone.replace(/[^\d+]/g, '');
}

export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Enhanced security headers middleware
export function addSecurityHeaders(response) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'none';",
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none'
  };

  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

// Request size limit middleware
export function withSizeLimit(maxSize = 1024 * 1024) { // 1MB default
  return async function sizeLimitMiddleware(request) {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json(
        { error: 'Request too large', message: 'Request body exceeds size limit' },
        { status: 413 }
      );
    }

    return null;
  };
}

// CORS middleware
export function withCORS(allowedOrigins = ['*']) {
  return function corsMiddleware(request) {
    const origin = request.headers.get('origin');
    const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

    const response = new Response();
    
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
  };
}

// Input validation middleware
export function withValidation(schemaName) {
  return async function validationMiddleware(request) {
    try {
      const body = await request.json();
      const sanitizedBody = sanitizeObject(body);
      const validation = validateData(sanitizedBody, schemaName);

      if (!validation.valid) {
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            message: 'Invalid input data',
            details: validation.errors 
          },
          { status: 400 }
        );
      }

      // Replace request body with sanitized data
      request.body = sanitizedBody;
      return null;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
  };
}

// Rate limiting middleware
export function withRateLimit(type, maxAttempts, windowMs) {
  return async function rateLimitMiddleware(request) {
    const result = await rateLimit(request, type, maxAttempts, windowMs);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: result.message,
          remainingTime: result.remainingTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + result.remainingTime).toISOString(),
            'Retry-After': Math.ceil(result.remainingTime / 1000).toString()
          }
        }
      );
    }
    
    return null;
  };
}

// Combined security middleware
export function withSecurity(options = {}) {
  const {
    validationSchema = null,
    rateLimitType = 'api_requests',
    maxAttempts = 100,
    windowMs = 15 * 60 * 1000,
    maxSize = 1024 * 1024,
    corsOrigins = ['*']
  } = options;

  return async function securityMiddleware(request) {
    // Apply CORS
    const corsResponse = withCORS(corsOrigins)(request);
    if (corsResponse) return corsResponse;

    // Apply size limit
    const sizeResponse = withSizeLimit(maxSize)(request);
    if (sizeResponse) return sizeResponse;

    // Apply rate limiting
    const rateResponse = await withRateLimit(rateLimitType, maxAttempts, windowMs)(request);
    if (rateResponse) return rateResponse;

    // Apply validation if schema provided
    if (validationSchema) {
      const validationResponse = await withValidation(validationSchema)(request);
      if (validationResponse) return validationResponse;
    }

    return null;
  };
}

// Missing functions that are imported by other files
export function validateSignupForm(data) {
  // Only validate password confirmation for email signup
  if (data.authMethod === 'email') {
    // Check if passwords match before running full validation
    if (data.password !== data.confirmPassword) {
      return {
        valid: false,
        errors: [{ field: 'confirmPassword', error: 'Passwords do not match' }],
        validatedData: data
      };
    }
  }

  const validation = validateData(data, 'userRegistration');
  
  // Additional business logic validation
  if (validation.valid) {
    // Check terms acceptance
    if (!data.termsAccepted) {
      validation.valid = false;
      validation.errors.push({ field: 'termsAccepted', error: 'You must accept the terms and conditions' });
    }
  }
  
  return validation;
}

export function detectFakeAccount(data) {
  const suspiciousPatterns = [
    // Suspicious email patterns
    /^test\d+@/i,
    /^fake\d+@/i,
    /^spam\d+@/i,
    /^temp\d+@/i,
    
    // Suspicious name patterns
    /^test\s*user$/i,
    /^fake\s*user$/i,
    /^spam\s*user$/i,
    /^temp\s*user$/i,
    /^admin\s*test$/i,
    
    // Suspicious username patterns
    /^test\d+$/i,
    /^fake\d+$/i,
    /^spam\d+$/i,
    /^temp\d+$/i,
    /^admin\d+$/i
  ];
  
  const suspiciousFields = ['email', 'name', 'username'];
  const suspiciousCount = suspiciousFields.reduce((count, field) => {
    const value = data[field] || '';
    return count + suspiciousPatterns.some(pattern => pattern.test(value));
  }, 0);
  
  return {
    isSuspicious: suspiciousCount >= 2,
    suspiciousFields: suspiciousFields.filter(field => {
      const value = data[field] || '';
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }),
    riskScore: suspiciousCount * 25 // 0-100 scale
  };
}

// Validation rules object for username checking
export const ValidationRules = {
  validateUsername: (username) => {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required' };
    }
    
    // Clean the username - remove all spaces and convert to lowercase
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    
    // Length validation
    if (cleanUsername.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }
    
    if (cleanUsername.length > 20) {
      return { valid: false, error: 'Username cannot exceed 20 characters' };
    }
    
    // ✅ STRICT VALIDATION: Only lowercase letters, numbers, and underscores
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return { valid: false, error: 'Username can only contain lowercase letters, numbers, and underscores (no spaces, uppercase letters, or special characters)' };
    }
    
    // Cannot be only numbers
    if (/^\d+$/.test(cleanUsername)) {
      return { valid: false, error: 'Username cannot be only numbers' };
    }
    
    // Cannot start or end with underscore
    if (cleanUsername.startsWith('_') || cleanUsername.endsWith('_')) {
      return { valid: false, error: 'Username cannot start or end with an underscore' };
    }
    
    // Cannot have consecutive underscores
    if (cleanUsername.includes('__')) {
      return { valid: false, error: 'Username cannot contain consecutive underscores' };
    }
    
    // Must contain at least one letter
    if (!/[a-z]/.test(cleanUsername)) {
      return { valid: false, error: 'Username must contain at least one letter' };
    }
    
    // Cannot have more than 3 consecutive identical characters
    if (/(.)\1{3,}/.test(cleanUsername)) {
      return { valid: false, error: 'Username cannot have more than 3 consecutive identical characters' };
    }
    
    // Check for reserved usernames - comprehensive list
    const reservedUsernames = [
      // System/Admin related
      'admin', 'administrator', 'root', 'system', 'support', 'help',
      'info', 'contact', 'mail', 'webmaster', 'postmaster', 'hostmaster',
      'moderator', 'mod', 'owner', 'staff', 'team', 'official',
      
      // Testing/Demo related
      'test', 'testing', 'demo', 'example', 'sample', 'guest', 'anonymous',
      'temp', 'temporary', 'trial', 'beta', 'alpha', 'dev', 'development',
      
      // User/Account related
      'user', 'users', 'member', 'members', 'account', 'accounts',
      'profile', 'profiles', 'settings', 'preferences', 'dashboard',
      'null', 'undefined', 'none', 'empty', 'blank', 'default',
      
      // Navigation/Pages
      'home', 'index', 'main', 'page', 'site', 'website', 'app',
      'about', 'contact', 'privacy', 'terms', 'legal', 'faq',
      
      // Auth related
      'login', 'logout', 'signin', 'signout', 'signup', 'register',
      'registration', 'auth', 'authentication', 'password', 'reset',
      'forgot', 'verify', 'verification', 'confirm', 'confirmation',
      
      // Actions
      'activate', 'activation', 'deactivate', 'delete', 'remove',
      'cancel', 'suspend', 'ban', 'block', 'unblock', 'enable', 'disable',
      
      // Security/Moderation
      'security', 'safety', 'trust', 'verified', 'certified', 'premium',
      'pro', 'plus', 'enterprise', 'business', 'corporate', 'official',
      'spam', 'abuse', 'report', 'flag', 'moderate', 'moderation',
      
      // Platform specific
      'fixly', 'fix', 'fixer', 'hire', 'hirer', 'job', 'jobs',
      'work', 'worker', 'service', 'services', 'provider', 'customer',
      
      // API/Technical
      'api', 'docs', 'documentation', 'swagger', 'graphql', 'rest',
      'webhook', 'callback', 'endpoint', 'server', 'client', 'database',
      
      // Common roles
      'ceo', 'cto', 'cfo', 'coo', 'manager', 'director', 'supervisor',
      'lead', 'head', 'chief', 'president', 'vice', 'senior', 'junior'
    ];
    
    if (reservedUsernames.includes(cleanUsername)) {
      return { valid: false, error: 'This username is reserved and cannot be used' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /^test\d*$/i,           // test, test1, test123
      /^user\d*$/i,           // user, user1, user123
      /^temp\d*$/i,           // temp, temp1
      /^demo\d*$/i,           // demo, demo1
      /^sample\d*$/i,         // sample, sample1
      /^guest\d*$/i,          // guest, guest1
      /^admin\d*$/i,          // admin, admin1
      /^fixly/i,              // anything starting with fixly
      /^[a-z]{1,2}\d{4,}$/,   // a1234, ab12345 (short letters + many numbers)
      /^\d+[a-z]{1,2}$/,      // 1234a, 12345ab (many numbers + short letters)
      /^(fuck|shit|damn|crap|stupid|idiot|moron|dumb)/i, // Profanity
      /^(sex|porn|xxx|adult)/i, // Adult content
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(cleanUsername)) {
        return { valid: false, error: 'Please choose a more appropriate and unique username' };
      }
    }
    
    // Success - return cleaned username
    return { 
      valid: true, 
      value: cleanUsername,
      error: null
    };
  }
};

// Enhanced validation utilities for secure input handling
export const validateAndSanitize = {
  // Numeric validation with strict type checking
  number: (value, { min = -Infinity, max = Infinity, required = false } = {}) => {
    if (value === undefined || value === null || value === '') {
      if (required) throw new Error('Numeric value is required');
      return null;
    }
    
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid numeric value');
    }
    
    if (num < min) throw new Error(`Value must be at least ${min}`);
    if (num > max) throw new Error(`Value cannot exceed ${max}`);
    
    return num;
  },

  // Enhanced coordinate validation
  coordinates: (lat, lng) => {
    const latitude = validateAndSanitize.number(lat, { min: -90, max: 90, required: true });
    const longitude = validateAndSanitize.number(lng, { min: -180, max: 180, required: true });
    
    return { lat: latitude, lng: longitude };
  },

  // Array validation with size limits
  array: (value, { maxItems = 100, itemValidator = null } = {}) => {
    if (!Array.isArray(value)) return [];
    
    if (value.length > maxItems) {
      throw new Error(`Array cannot have more than ${maxItems} items`);
    }
    
    if (itemValidator) {
      return value.map(itemValidator);
    }
    
    return value;
  },

  // MongoDB ObjectId validation
  objectId: (value, required = false) => {
    if (!value) {
      if (required) throw new Error('ObjectId is required');
      return null;
    }
    
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      throw new Error('Invalid ObjectId format');
    }
    
    return value;
  },

  // Email validation with domain checking
  email: (value, required = false) => {
    if (!value) {
      if (required) throw new Error('Email is required');
      return '';
    }
    
    const email = value.toLowerCase().trim();
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    // Additional security: check for suspicious email patterns
    const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    const domain = email.split('@')[1];
    if (suspiciousDomains.includes(domain)) {
      throw new Error('Email from temporary email services not allowed');
    }
    
    return email;
  }
};

// Budget validation with business logic
export const validateBudget = (budget) => {
  if (!budget || typeof budget !== 'object') {
    throw new Error('Budget is required');
  }

  const type = sanitizeString(budget.type, { strict: true });
  const validTypes = ['fixed', 'negotiable', 'hourly'];
  
  if (!validTypes.includes(type)) {
    throw new Error('Invalid budget type');
  }

  const amount = validateAndSanitize.number(budget.amount, { 
    min: 0, 
    max: 1000000, 
    required: type === 'fixed' || type === 'hourly' 
  });

  return {
    type,
    amount: amount || 0,
    currency: 'INR',
    materialsIncluded: Boolean(budget.materialsIncluded)
  };
};

// Location validation with geocoding verification
export const validateLocation = (location) => {
  if (!location || typeof location !== 'object') {
    throw new Error('Location is required');
  }

  const address = sanitizeString(location.address, { strict: true });
  const city = sanitizeString(location.city, { strict: true });
  const state = sanitizeString(location.state, { strict: true });

  if (!address || address.length < 5) {
    throw new Error('Valid address is required');
  }
  if (!city || city.length < 2) {
    throw new Error('Valid city is required');
  }
  if (!state || state.length < 2) {
    throw new Error('Valid state is required');
  }

  let coordinates = null;
  if (location.lat && location.lng) {
    coordinates = validateAndSanitize.coordinates(location.lat, location.lng);
  }

  const result = { address, city, state };
  
  if (location.pincode) {
    const pincode = sanitizeString(location.pincode, { strict: true });
    if (pincode && !/^[0-9]{6}$/.test(pincode)) {
      throw new Error('Invalid pincode format');
    }
    result.pincode = pincode;
  }

  if (coordinates) {
    result.lat = coordinates.lat;
    result.lng = coordinates.lng;
    result.coordinates = {
      type: 'Point',
      coordinates: [coordinates.lng, coordinates.lat]
    };
  }

  return result;
};

// Skills validation with profanity checking
export const validateSkills = (skills) => {
  if (!Array.isArray(skills)) {
    throw new Error('Skills must be an array');
  }
  
  if (skills.length === 0) {
    throw new Error('At least one skill is required');
  }
  
  if (skills.length > 20) {
    throw new Error('Cannot have more than 20 skills');
  }

  const profanityList = ['fuck', 'shit', 'damn', 'crap', 'stupid', 'idiot', 'moron', 'dumb'];
  
  return skills.map(skill => {
    const sanitized = sanitizeString(skill, { strict: true });
    
    if (!sanitized || sanitized.length < 2) {
      throw new Error('Each skill must be at least 2 characters');
    }
    
    if (sanitized.length > 50) {
      throw new Error('Skills cannot exceed 50 characters');
    }
    
    // Check for profanity
    const lowerSkill = sanitized.toLowerCase();
    if (profanityList.some(word => lowerSkill.includes(word))) {
      throw new Error('Skills cannot contain inappropriate language');
    }
    
    return lowerSkill;
  });
};

// File validation with security checks
export const validateFile = (file) => {
  if (!file || typeof file !== 'object') {
    throw new Error('File data is required');
  }

  const url = sanitizeString(file.url, { strict: true });
  const filename = sanitizeString(file.filename, { strict: true });

  if (!url || !filename) {
    throw new Error('File URL and filename are required');
  }

  // Validate URL format and allowed file types
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx)$/i;
  if (!allowedExtensions.test(url)) {
    throw new Error('File type not allowed. Allowed: JPG, PNG, GIF, WebP, PDF, DOC, DOCX');
  }

  // Check for suspicious file patterns
  const dangerousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|php|asp|jsp)$/i,
    /javascript:/i,
    /data:.*base64/i
  ];

  if (dangerousPatterns.some(pattern => pattern.test(url))) {
    throw new Error('File type or URL pattern not allowed for security reasons');
  }

  // Validate file size
  const size = validateAndSanitize.number(file.size, { 
    min: 0, 
    max: 10 * 1024 * 1024 // 10MB 
  });

  return { 
    url, 
    filename: filename.substring(0, 100), // Limit filename length
    size, 
    fileType: file.fileType 
  };
};

// Rate limit key generation with IP validation
export const generateRateLimitKey = (request, identifier) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  let ip = '127.0.0.1';
  
  if (forwardedFor) {
    // Take first IP from comma-separated list
    ip = forwardedFor.split(',')[0].trim();
  } else if (realIp) {
    ip = realIp.trim();
  }
  
  // Validate IP format (basic validation)
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ipv4Pattern.test(ip) && !ipv6Pattern.test(ip)) {
    ip = '127.0.0.1'; // Fallback for invalid IP
  }
  
  return `${identifier}:${ip}`;
};

// Enhanced file upload validation with security checks
export const validateFileUpload = (file, options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    maxSize = 5 * 1024 * 1024, // 5MB default
    maxFiles = 10,
    allowDocuments = false,
    allowVideos = false
  } = options;

  if (!file) {
    throw new Error('No file provided');
  }

  // Extended allowed types if documents/videos are allowed
  let validTypes = [...allowedTypes];
  if (allowDocuments) {
    validTypes.push('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
  if (allowVideos) {
    validTypes.push('video/mp4', 'video/webm', 'video/ogg');
  }

  // Validate file type
  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${validTypes.join(', ')}`);
  }

  // Validate file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new Error(`File size too large. Maximum allowed: ${maxSizeMB}MB`);
  }

  // Validate filename for security (prevent path traversal)
  const filename = file.name || 'unnamed';
  if (/[<>:"/\\|?*]/.test(filename) || filename.includes('..')) {
    throw new Error('Invalid filename. Contains unsafe characters');
  }

  // Check for suspicious file extensions in filename
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar', 
    '.php', '.asp', '.jsp', '.sh', '.ps1', '.pl', '.py'
  ];
  
  const lowercaseFilename = filename.toLowerCase();
  if (dangerousExtensions.some(ext => lowercaseFilename.endsWith(ext))) {
    throw new Error('File type not allowed for security reasons');
  }

  // Additional checks for image files
  if (file.type.startsWith('image/')) {
    // Basic image dimension validation (if available)
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && file instanceof File) {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 4000; // Max 4000px width/height
          if (img.width > maxDimension || img.height > maxDimension) {
            reject(new Error(`Image dimensions too large. Maximum: ${maxDimension}x${maxDimension}px`));
          } else {
            resolve({
              isValid: true,
              file,
              metadata: {
                width: img.width,
                height: img.height,
                size: file.size,
                type: file.type,
                name: sanitizeFilename(filename)
              }
            });
          }
        };
        img.onerror = () => reject(new Error('Invalid or corrupted image file'));
        img.src = URL.createObjectURL(file);
      } else {
        // Server-side validation (simplified)
        resolve({
          isValid: true,
          file,
          metadata: {
            size: file.size,
            type: file.type,
            name: sanitizeFilename(filename)
          }
        });
      }
    });
  }

  // Return validation result for non-image files
  return Promise.resolve({
    isValid: true,
    file,
    metadata: {
      size: file.size,
      type: file.type,
      name: sanitizeFilename(filename)
    }
  });
};

// Sanitize filename for safe storage
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
    .replace(/_+/g, '_') // Remove multiple underscores
    .substring(0, 100) // Limit length
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

// Validate multiple file uploads
export const validateMultipleFileUploads = async (files, options = {}) => {
  const { maxFiles = 10 } = options;

  if (!Array.isArray(files)) {
    throw new Error('Files must be provided as an array');
  }

  if (files.length === 0) {
    throw new Error('No files provided');
  }

  if (files.length > maxFiles) {
    throw new Error(`Too many files. Maximum allowed: ${maxFiles}`);
  }

  const validationResults = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await validateFileUpload(files[i], options);
      validationResults.push(result);
    } catch (error) {
      errors.push(`File ${i + 1}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return {
    isValid: true,
    files: validationResults,
    totalSize: validationResults.reduce((total, result) => total + result.metadata.size, 0),
    count: validationResults.length
  };
};

// File type detection by magic number (additional security)
export const validateFileByMagicNumber = (buffer) => {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, detectedType: null };
  }

  const magicNumbers = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46, 0x38],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46]
  };

  for (const [mimeType, signature] of Object.entries(magicNumbers)) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { isValid: true, detectedType: mimeType };
    }
  }

  return { isValid: false, detectedType: null };
};