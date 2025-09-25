// utils/validation.js - Comprehensive input validation middleware
import { NextResponse } from 'next/server';
import { rateLimit } from './rateLimiting';

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
    if (isNaN(numValue)) {
      return { valid: false, error: `${schema.fieldName || 'Field'} must be a valid number` };
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

// Sanitization functions
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
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

// Security headers middleware
export function addSecurityHeaders(response) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  };

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
      'moderator', 'mod', 'owner', 'staff', 'team', 'official', 'operator',
      'service', 'noreply', 'no-reply', 'mailer-daemon', 'daemon',

      // Testing/Demo related
      'test', 'testing', 'demo', 'example', 'sample', 'guest', 'anonymous',
      'temp', 'temporary', 'trial', 'beta', 'alpha', 'dev', 'development',
      'staging', 'production', 'local', 'localhost', 'debug',

      // User/Account related
      'user', 'users', 'member', 'members', 'account', 'accounts',
      'profile', 'profiles', 'settings', 'preferences', 'dashboard',
      'null', 'undefined', 'none', 'empty', 'blank', 'default',
      'customer', 'client', 'vendor', 'public', 'private',

      // Navigation/Pages
      'home', 'index', 'main', 'page', 'site', 'website', 'app',
      'about', 'contact', 'privacy', 'terms', 'legal', 'faq',
      'blog', 'news', 'forum', 'community', 'social', 'feed',
      'search', 'browse', 'explore', 'discover', 'trending',

      // Auth related
      'login', 'logout', 'signin', 'signout', 'signup', 'register',
      'registration', 'auth', 'authentication', 'password', 'reset',
      'forgot', 'verify', 'verification', 'confirm', 'confirmation',
      'oauth', 'session', 'token', 'credential', 'authorize',

      // Actions
      'activate', 'activation', 'deactivate', 'delete', 'remove',
      'cancel', 'suspend', 'ban', 'block', 'unblock', 'enable', 'disable',
      'create', 'update', 'edit', 'modify', 'save', 'submit', 'send',
      'upload', 'download', 'export', 'import', 'sync', 'backup',

      // Security/Moderation
      'security', 'safety', 'trust', 'verified', 'certified', 'premium',
      'pro', 'plus', 'enterprise', 'business', 'corporate', 'official',
      'spam', 'abuse', 'report', 'flag', 'moderate', 'moderation',
      'violation', 'complaint', 'review', 'audit', 'monitor',

      // Platform specific - Fixly
      'fixly', 'fix', 'fixer', 'hire', 'hirer', 'job', 'jobs',
      'work', 'worker', 'service', 'services', 'provider', 'customer',
      'booking', 'order', 'request', 'quote', 'estimate', 'invoice',
      'payment', 'billing', 'subscription', 'plan', 'pricing',

      // API/Technical
      'api', 'docs', 'documentation', 'swagger', 'graphql', 'rest',
      'webhook', 'callback', 'endpoint', 'server', 'client', 'database',
      'cache', 'redis', 'mongodb', 'mysql', 'postgres', 'firebase',
      'cdn', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',

      // Common roles
      'ceo', 'cto', 'cfo', 'coo', 'manager', 'director', 'supervisor',
      'lead', 'head', 'chief', 'president', 'vice', 'senior', 'junior',
      'intern', 'assistant', 'coordinator', 'specialist', 'analyst',

      // Prohibited/Inappropriate
      'nazi', 'hitler', 'terrorist', 'isis', 'porn', 'sex', 'xxx',
      'casino', 'gambling', 'drugs', 'weapon', 'gun', 'bomb',
      'scam', 'fraud', 'hack', 'phish', 'malware', 'virus',

      // Social Media
      'facebook', 'twitter', 'instagram', 'youtube', 'tiktok', 'snapchat',
      'whatsapp', 'telegram', 'discord', 'reddit', 'linkedin',

      // Common Brands/Companies
      'google', 'apple', 'microsoft', 'amazon', 'meta', 'netflix',
      'uber', 'airbnb', 'paypal', 'stripe', 'visa', 'mastercard'
    ];
    
    if (reservedUsernames.includes(cleanUsername)) {
      return { valid: false, error: 'Username already taken' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /^test\d*$/i,           // test, test1, test123
      /^user\d*$/i,           // user, user1, user123
      /^temp\d*$/i,           // temp, temp1
      /^demo\d*$/i,           // demo, demo1
      /^sample\d*$/i,         // sample, sample1

      // COMPREHENSIVE: Block usernames containing problematic words
      /.*test.*/i,            // anything containing "test"
      /.*user.*/i,            // anything containing "user"
      /.*temp.*/i,            // anything containing "temp"
      /.*demo.*/i,            // anything containing "demo"
      /.*sample.*/i,          // anything containing "sample"
      /.*admin.*/i,           // anything containing "admin"
      /.*mod.*/i,             // anything containing "mod"
      /.*null.*/i,            // anything containing "null"
      /.*undefined.*/i,       // anything containing "undefined"
      /.*default.*/i,         // anything containing "default"
      /.*fake.*/i,            // anything containing "fake"
      /.*spam.*/i,            // anything containing "spam"
      /.*bot.*/i,             // anything containing "bot"
      /.*root.*/i,            // anything containing "root"
      /.*system.*/i,          // anything containing "system"
      /^guest\d*$/i,          // guest, guest1
      /^admin\d*$/i,          // admin, admin1
      /^fixly/i,              // anything starting with fixly
      /^[a-z]{1,2}\d{4,}$/,   // a1234, ab12345 (short letters + many numbers)
      /^\d+[a-z]{1,2}$/,      // 1234a, 12345ab (many numbers + short letters)

      // Enhanced profanity patterns
      /^(fuck|shit|damn|crap|stupid|idiot|moron|dumb|bitch|ass|hell)/i,
      /^(sex|porn|xxx|adult|nude|naked|erotic)/i,
      /^(nazi|hitler|terrorist|isis|bomb|gun|weapon|kill|murder|death)/i,
      /^(drug|cocaine|heroin|weed|marijuana|cannabis|meth|crack)/i,
      /^(scam|fraud|fake|phish|hack|spam|virus|malware)/i,
      /^(casino|gambling|bet|lottery|poker|blackjack)/i,

      // Hindi/Indian profanity patterns
      /^(madarchod|behenchod|chutiya|gandu|randi|saala|harami)/i,
      /^(bc|mc|bkl|lund|lauda|bhosda|chut)/i,

      // Tamil profanity patterns
      /^(punda|sunni|koodhi|ommala|poda|podi|maire|mairu)/i,
      /^(naaye|paithiyam|loose|aalu|kena|thevdiya|thevidiya)/i,
      /^(poolu|kunna|myre|thendi|para|otha|othaiyya)/i,

      // Telugu profanity patterns
      /^(dengey|lanjkoduku|lanjakoduku|boothulu|modda|puku)/i,
      /^(gulthi|gudda|dengamma|lanjakodaki|badava|gadida)/i,

      // Malayalam profanity patterns
      /^(thendi|potta|myre|kunna|pooru|thayoli)/i,
      /^(maire|para|poda|podi|myru|poorru)/i,

      // Kannada profanity patterns
      /^(boli|gubbu|bevarsi|nayi|kiru|sullu)/i,
      /^(waste|kelbedi|muchko|bekku|kathe|chapri)/i,

      // Pattern-based blocking
      /^(buy|sell|cheap|free|discount|offer|deal).*$/i,  // commercial spam
      /^(money|cash|earn|income|profit|rich).*$/i,       // financial spam
      /^(dating|hookup|meet|single|lonely).*$/i,         // dating spam
      /.*(69|420|666).*/,                                // inappropriate numbers
      /^(whatsapp|telegram|instagram|facebook).*$/i,     // social media references
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(cleanUsername)) {
        return { valid: false, error: 'Invalid username' };
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