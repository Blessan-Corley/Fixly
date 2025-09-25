/**
 * Comprehensive Content Validation and Sanitization
 * Strict validation for all user inputs with security focus
 */

// Safe DOMPurify import with fallback
let DOMPurify;
try {
  DOMPurify = require('isomorphic-dompurify');
} catch (error) {
  console.warn('DOMPurify import failed, using fallback');
  DOMPurify = {
    sanitize: (input) => input // Fallback sanitizer
  };
}
import validator from 'validator';
import { z } from 'zod';

// Sensitive content patterns to block
const BLOCKED_PATTERNS = {
  phoneNumbers: [
    /\b\d{10}\b/g,
    /\+91[-.\s]?\d{10}\b/g,
    /\b91\d{10}\b/g,
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /\bcall\s+me\s+at\s+\d/gi,
    /\bphone\s*[:=]\s*\d/gi,
    /\bmobile\s*[:=]\s*\d/gi,
    /\bcontact\s*[:=]\s*\d/gi
  ],
  emails: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    /\bemail\s*[:=]\s*[A-Za-z0-9._%+-]+@/gi,
    /\bmail\s+me\s+at\s+/gi,
    /\bgmail\s*[:=]/gi,
    /\byahoo\s*[:=]/gi
  ],
  socialMedia: [
    /\b(whatsapp|telegram|instagram|facebook|twitter|snapchat|tiktok)\b/gi,
    /\bwhatsapp\s+me\b/gi,
    /\btelegram\s*[:=@]/gi,
    /\binsta\s*[:=@]/gi,
    /\bfb\s*[:=]/gi,
    /\bwa\.me\b/gi,
    /\bt\.me\//gi
  ],
  externalContact: [
    /\bmeet\s+me\s+at\b/gi,
    /\bcome\s+to\s+my\s+place\b/gi,
    /\bdirect\s+contact\b/gi,
    /\boutside\s+the\s+app\b/gi,
    /\boff\s+platform\b/gi,
    /\bdm\s+me\b/gi,
    /\bprivate\s+message\b/gi
  ],
  financialTerms: [
    /\bcash\s+only\b/gi,
    /\bno\s+app\s+payment\b/gi,
    /\bdirect\s+payment\b/gi,
    /\bbank\s+transfer\b/gi,
    /\bupi\s*[:=]/gi,
    /\bpaytm\s*[:=]/gi,
    /\bgpay\s*[:=]/gi,
    /\bphonepe\s*[:=]/gi
  ],
  spamKeywords: [
    /\bclick\s+here\b/gi,
    /\bfree\s+money\b/gi,
    /\bget\s+rich\b/gi,
    /\bwork\s+from\s+home\b/gi,
    /\bearn\s+\d+\s+per\s+day\b/gi,
    /\bguaranteed\s+income\b/gi,
    /\bno\s+investment\b/gi,
    /\bmlm\b/gi,
    /\bpyramid\s+scheme\b/gi
  ]
};

// Profanity and inappropriate content
const PROFANITY_PATTERNS = [
  // Add appropriate profanity patterns for your region/language
  /\b(inappropriate|offensive|words|here)\b/gi
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(--|\/\*|\*\/|;|\||&)/g,
  /('|(\\)|(\-\-)|(%27)|(\%3D))/gi
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi
];

// Common validation schemas
export const ValidationSchemas = {
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s.'-]+$/, 'Name contains invalid characters'),

  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscore, and dash'),

  email: z.string()
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters'),

  phone: z.string()
    .regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number'),

  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters'),

  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be less than 2000 characters'),

  comment: z.string()
    .min(5, 'Comment must be at least 5 characters')
    .max(500, 'Comment must be less than 500 characters'),

  address: z.string()
    .min(10, 'Address must be at least 10 characters')
    .max(200, 'Address must be less than 200 characters'),

  pincode: z.string()
    .regex(/^[1-9][0-9]{5}$/, 'Invalid Indian pincode'),

  budget: z.number()
    .min(50, 'Budget must be at least ₹50')
    .max(100000, 'Budget must be less than ₹1,00,000'),

  rating: z.number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
};

/**
 * Check for sensitive content in text
 */
export function detectSensitiveContent(text) {
  const violations = [];

  Object.entries(BLOCKED_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        violations.push({
          category,
          pattern: index,
          matches: matches.slice(0, 3), // Limit to first 3 matches
          severity: getSeverityLevel(category)
        });
      }
    });
  });

  return violations;
}

/**
 * Get severity level for violation category
 */
function getSeverityLevel(category) {
  const severityMap = {
    phoneNumbers: 'high',
    emails: 'high',
    socialMedia: 'medium',
    externalContact: 'medium',
    financialTerms: 'high',
    spamKeywords: 'low',
    profanity: 'medium'
  };
  return severityMap[category] || 'low';
}

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(content) {
  if (!content) return '';

  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    STRIP_COMMENTS: true
  });
}

/**
 * Sanitize and validate text input
 */
export function sanitizeText(text, options = {}) {
  if (!text) return '';

  const {
    maxLength = 1000,
    allowHTML = false,
    strictMode = true
  } = options;

  // Basic sanitization
  let sanitized = text.toString().trim();

  // Remove or escape HTML if not allowed
  if (!allowHTML) {
    sanitized = validator.escape(sanitized);
  } else {
    sanitized = sanitizeHTML(sanitized);
  }

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }

  // In strict mode, check for sensitive content
  if (strictMode) {
    const violations = detectSensitiveContent(sanitized);
    if (violations.some(v => v.severity === 'high')) {
      throw new Error('Content contains prohibited information');
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number
 */
export function validatePhone(phone) {
  if (!phone) return null;

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Handle different formats
  if (digits.length === 10) {
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  } else if (digits.length === 13 && digits.startsWith('091')) {
    return `+${digits.substring(1)}`;
  }

  throw new Error('Invalid phone number format');
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email) {
  if (!email) return null;

  const sanitized = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false
  });

  if (!validator.isEmail(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Check for SQL injection attempts
 */
export function detectSQLInjection(input) {
  if (!input) return false;

  return SQL_INJECTION_PATTERNS.some(pattern =>
    pattern.test(input.toString())
  );
}

/**
 * Check for XSS attempts
 */
export function detectXSS(input) {
  if (!input) return false;

  return XSS_PATTERNS.some(pattern =>
    pattern.test(input.toString())
  );
}

/**
 * Main content validation middleware
 */
export function contentValidationMiddleware(schema = null) {
  return async (req, res, next) => {
    try {
      // Skip GET requests
      if (req.method === 'GET') {
        return next();
      }

      const { body, query } = req;

      // Validate against SQL injection and XSS
      const allInputs = JSON.stringify({ ...body, ...query });

      if (detectSQLInjection(allInputs)) {
        return res.status(400).json({
          error: 'Invalid input detected',
          message: 'SQL injection attempt blocked'
        });
      }

      if (detectXSS(allInputs)) {
        return res.status(400).json({
          error: 'Invalid input detected',
          message: 'XSS attempt blocked'
        });
      }

      // Sanitize text fields in body
      if (body && typeof body === 'object') {
        req.body = sanitizeObject(body);
      }

      // Validate against schema if provided
      if (schema && body) {
        try {
          const validated = schema.parse(body);
          req.body = validated;
        } catch (error) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'Input validation errors',
            details: error.errors || error.message
          });
        }
      }

      // Check for sensitive content in text fields
      const textFields = extractTextFields(req.body);
      for (const [field, text] of textFields) {
        const violations = detectSensitiveContent(text);
        const highSeverityViolations = violations.filter(v => v.severity === 'high');

        if (highSeverityViolations.length > 0) {
          return res.status(400).json({
            error: 'Content policy violation',
            message: `Field '${field}' contains prohibited content`,
            field,
            violations: highSeverityViolations.map(v => ({
              category: v.category,
              severity: v.severity
            }))
          });
        }
      }

      next();
    } catch (error) {
      console.error('Content validation error:', error);
      return res.status(500).json({
        error: 'Validation error',
        message: 'Failed to validate content'
      });
    }
  };
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj, maxDepth = 5) {
  if (maxDepth <= 0 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value, { strictMode: false });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, maxDepth - 1);
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Extract text fields from object for content checking
 */
function extractTextFields(obj, prefix = '', maxDepth = 3) {
  const textFields = [];

  if (maxDepth <= 0 || !obj || typeof obj !== 'object') {
    return textFields;
  }

  Object.entries(obj).forEach(([key, value]) => {
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' && value.length > 0) {
      textFields.push([fieldName, value]);
    } else if (typeof value === 'object' && value !== null) {
      textFields.push(...extractTextFields(value, fieldName, maxDepth - 1));
    }
  });

  return textFields;
}

/**
 * Specific validation functions for common fields
 */
export const FieldValidators = {
  jobTitle: (title) => {
    const sanitized = sanitizeText(title, { maxLength: 100 });
    const violations = detectSensitiveContent(sanitized);

    if (violations.some(v => v.severity === 'high')) {
      throw new Error('Job title contains prohibited content');
    }

    return ValidationSchemas.title.parse(sanitized);
  },

  jobDescription: (description) => {
    const sanitized = sanitizeText(description, { maxLength: 2000 });
    const violations = detectSensitiveContent(sanitized);

    if (violations.some(v => v.severity === 'high')) {
      throw new Error('Job description contains prohibited content');
    }

    return ValidationSchemas.description.parse(sanitized);
  },

  userComment: (comment) => {
    const sanitized = sanitizeText(comment, { maxLength: 500 });
    const violations = detectSensitiveContent(sanitized);

    if (violations.some(v => v.severity === 'high')) {
      throw new Error('Comment contains prohibited content');
    }

    return ValidationSchemas.comment.parse(sanitized);
  },

  userProfile: (profile) => {
    const sanitized = {};

    if (profile.name) {
      sanitized.name = ValidationSchemas.name.parse(sanitizeText(profile.name));
    }

    if (profile.username) {
      sanitized.username = ValidationSchemas.username.parse(sanitizeText(profile.username));
    }

    if (profile.email) {
      sanitized.email = validateEmail(profile.email);
    }

    if (profile.phone) {
      sanitized.phone = validatePhone(profile.phone);
    }

    return sanitized;
  }
};

/**
 * Create content security report
 */
export function generateSecurityReport(violations) {
  const report = {
    timestamp: new Date().toISOString(),
    totalViolations: violations.length,
    severityBreakdown: {
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length
    },
    categoryBreakdown: {},
    recommendations: []
  };

  // Count by category
  violations.forEach(v => {
    report.categoryBreakdown[v.category] = (report.categoryBreakdown[v.category] || 0) + 1;
  });

  // Generate recommendations
  if (report.severityBreakdown.high > 0) {
    report.recommendations.push('Content contains high-risk violations and should be rejected');
  }
  if (report.severityBreakdown.medium > 0) {
    report.recommendations.push('Content requires manual review before approval');
  }
  if (violations.some(v => v.category === 'phoneNumbers' || v.category === 'emails')) {
    report.recommendations.push('User attempting to share contact information outside platform');
  }

  return report;
}