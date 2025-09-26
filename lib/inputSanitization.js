/**
 * Comprehensive Input Sanitization Middleware
 * Advanced sanitization with multiple layers of security
 */

// Safe DOMPurify import with fallback
let DOMPurify;
if (typeof window !== 'undefined') {
  // Client-side
  DOMPurify = require('dompurify');
} else {
  // Server-side with JSDOM
  try {
    const { JSDOM } = require('jsdom');
    const window = new JSDOM('').window;
    DOMPurify = require('dompurify')(window);
  } catch (error) {
    console.warn('DOMPurify server-side setup failed, using fallback');
    DOMPurify = {
      sanitize: (input) => input // Simple fallback
    };
  }
}
import validator from 'validator';
import xss from 'xss';

// Security configurations
const SECURITY_CONFIG = {
  maxStringLength: 10000,
  maxArrayLength: 100,
  maxObjectDepth: 10,
  maxKeys: 50,
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

// Dangerous patterns to completely block
const DANGEROUS_PATTERNS = [
  // Script injection
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,

  // SQL injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(union\s+select)/gi,
  /(\-\-|\#|\/\*|\*\/)/g,

  // Command injection
  /(\||&|;|\$\(|\`)/g,
  /(exec|eval|system|shell_exec)/gi,

  // Path traversal
  /(\.\.\/|\.\.\\)/g,
  /(\%2e\%2e\%2f|\%2e\%2e\%5c)/gi,

  // Data URLs with scripts
  /data:\s*text\/html/gi,
  /data:\s*application\/javascript/gi,
];

// XSS filter configuration
const XSS_OPTIONS = {
  whiteList: {
    b: [],
    i: [],
    em: [],
    strong: [],
    u: [],
    br: [],
    p: ['class'],
    span: ['class'],
    div: ['class'],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
  allowCommentTag: false,
  onIgnoreTag: function (tag, html, options) {
    // Log dangerous tags
    console.warn(`Dangerous tag blocked: ${tag}`);
    return '';
  },
  onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
    if (name === 'style') {
      // Allow basic CSS but filter dangerous properties
      return name + '="' + xss.filterCSS(value) + '"';
    }
    return '';
  }
};

/**
 * Deep sanitize object with type checking
 */
function deepSanitize(obj, depth = 0, keyCount = 0) {
  // Prevent infinite recursion and DoS attacks
  if (depth > SECURITY_CONFIG.maxObjectDepth) {
    throw new Error('Maximum object depth exceeded');
  }

  if (keyCount > SECURITY_CONFIG.maxKeys) {
    throw new Error('Maximum object keys exceeded');
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number') {
    return sanitizeNumber(obj);
  }

  if (typeof obj === 'boolean') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length > SECURITY_CONFIG.maxArrayLength) {
      throw new Error('Array length exceeds maximum allowed');
    }

    return obj.map((item, index) => {
      try {
        return deepSanitize(item, depth + 1, keyCount);
      } catch (error) {
        console.warn(`Array item ${index} sanitization failed:`, error.message);
        return null;
      }
    }).filter(item => item !== null);
  }

  // Handle objects
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length > SECURITY_CONFIG.maxKeys) {
      throw new Error('Object has too many keys');
    }

    const sanitized = {};
    let currentKeyCount = keyCount;

    for (const key of keys) {
      const sanitizedKey = sanitizeString(key);
      if (!sanitizedKey || sanitizedKey.length === 0) {
        continue;
      }

      try {
        sanitized[sanitizedKey] = deepSanitize(obj[key], depth + 1, currentKeyCount + 1);
        currentKeyCount++;
      } catch (error) {
        console.warn(`Object key ${key} sanitization failed:`, error.message);
        continue;
      }
    }

    return sanitized;
  }

  // Unknown type, return null
  return null;
}

/**
 * Sanitize string with multiple layers
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return String(str);
  }

  // Length check
  if (str.length > SECURITY_CONFIG.maxStringLength) {
    str = str.substring(0, SECURITY_CONFIG.maxStringLength);
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(str)) {
      throw new Error('String contains dangerous content');
    }
  }

  // Basic sanitization
  let sanitized = str.trim();

  // HTML entity encoding for basic protection
  sanitized = validator.escape(sanitized);

  // Additional XSS filtering
  sanitized = xss(sanitized, XSS_OPTIONS);

  // DOMPurify as final layer
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    FORBID_SCRIPT: true,
    STRIP_COMMENTS: true,
    USE_PROFILES: { html: false }
  });

  return sanitized;
}

/**
 * Sanitize and validate numbers
 */
function sanitizeNumber(num) {
  if (typeof num === 'string') {
    // Try to parse string numbers
    const parsed = parseFloat(num);
    if (isNaN(parsed)) {
      throw new Error('Invalid number format');
    }
    num = parsed;
  }

  if (typeof num !== 'number') {
    throw new Error('Value is not a number');
  }

  // Check for special values
  if (!isFinite(num)) {
    throw new Error('Number is not finite');
  }

  // Reasonable bounds
  if (num < -1e10 || num > 1e10) {
    throw new Error('Number outside reasonable bounds');
  }

  return num;
}

/**
 * Sanitize file uploads
 */
function sanitizeFile(file) {
  if (!file || typeof file !== 'object') {
    throw new Error('Invalid file object');
  }

  const { name, type, size, data } = file;

  // Validate file type
  if (!SECURITY_CONFIG.allowedFileTypes.includes(type)) {
    throw new Error(`File type ${type} not allowed`);
  }

  // Validate file size
  if (size > SECURITY_CONFIG.maxFileSize) {
    throw new Error('File size exceeds maximum allowed');
  }

  // Sanitize file name
  const sanitizedName = sanitizeString(name)
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100);

  return {
    name: sanitizedName,
    type,
    size,
    data: data // File data should be handled by upload service
  };
}

/**
 * Main sanitization middleware
 */
export default function inputSanitizationMiddleware(options = {}) {
  const config = { ...SECURITY_CONFIG, ...options };

  return async (req, res, next) => {
    try {
      // Skip GET requests unless specifically configured
      if (req.method === 'GET' && !config.sanitizeQuery) {
        return next();
      }

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        try {
          req.body = deepSanitize(req.body);
        } catch (error) {
          return res.status(400).json({
            error: 'Input sanitization failed',
            message: error.message,
            code: 'SANITIZATION_ERROR'
          });
        }
      }

      // Sanitize query parameters if enabled
      if (config.sanitizeQuery && req.query) {
        try {
          req.query = deepSanitize(req.query);
        } catch (error) {
          return res.status(400).json({
            error: 'Query sanitization failed',
            message: error.message,
            code: 'QUERY_SANITIZATION_ERROR'
          });
        }
      }

      // Sanitize URL parameters
      if (req.params) {
        try {
          req.params = deepSanitize(req.params);
        } catch (error) {
          return res.status(400).json({
            error: 'URL parameter sanitization failed',
            message: error.message,
            code: 'PARAMS_SANITIZATION_ERROR'
          });
        }
      }

      // Handle file uploads
      if (req.files && Array.isArray(req.files)) {
        try {
          req.files = req.files.map(sanitizeFile);
        } catch (error) {
          return res.status(400).json({
            error: 'File sanitization failed',
            message: error.message,
            code: 'FILE_SANITIZATION_ERROR'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Input sanitization middleware error:', error);
      return res.status(500).json({
        error: 'Internal sanitization error',
        message: 'Failed to process request safely',
        code: 'INTERNAL_SANITIZATION_ERROR'
      });
    }
  };
}

/**
 * Strict sanitization for high-security endpoints
 */
export function strictSanitization() {
  return inputSanitizationMiddleware({
    maxStringLength: 1000,
    maxArrayLength: 20,
    maxObjectDepth: 5,
    maxKeys: 20,
    sanitizeQuery: true
  });
}

/**
 * Relaxed sanitization for content creation
 */
export function relaxedSanitization() {
  return inputSanitizationMiddleware({
    maxStringLength: 50000,
    maxArrayLength: 500,
    maxObjectDepth: 15,
    maxKeys: 100,
    sanitizeQuery: false
  });
}

/**
 * API-specific sanitization
 */
export function apiSanitization() {
  return inputSanitizationMiddleware({
    maxStringLength: 5000,
    maxArrayLength: 100,
    maxObjectDepth: 8,
    maxKeys: 50,
    sanitizeQuery: true
  });
}

/**
 * Custom sanitizer for specific data types
 */
export const CustomSanitizers = {
  // Email sanitization
  email: (email) => {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email input');
    }

    const sanitized = validator.normalizeEmail(email.toLowerCase().trim());
    if (!validator.isEmail(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  },

  // Phone number sanitization
  phone: (phone) => {
    if (!phone || typeof phone !== 'string') {
      throw new Error('Invalid phone input');
    }

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Validate Indian phone number
    if (!/^[6-9]\d{9}$/.test(digits) && !/^91[6-9]\d{9}$/.test(digits)) {
      throw new Error('Invalid phone number format');
    }

    return digits.length === 10 ? `+91${digits}` : `+${digits}`;
  },

  // URL sanitization
  url: (url) => {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL input');
    }

    const sanitized = url.trim().toLowerCase();

    if (!validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      throw new Error('Invalid URL format');
    }

    return sanitized;
  },

  // Amount/money sanitization
  amount: (amount) => {
    const num = sanitizeNumber(amount);

    if (num < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (num > 10000000) { // 1 crore max
      throw new Error('Amount exceeds maximum limit');
    }

    // Round to 2 decimal places
    return Math.round(num * 100) / 100;
  },

  // Coordinate sanitization
  coordinate: (coord) => {
    const num = sanitizeNumber(coord);

    // Basic coordinate validation (very loose bounds)
    if (num < -180 || num > 180) {
      throw new Error('Invalid coordinate value');
    }

    return num;
  },

  // Date sanitization
  date: (date) => {
    if (!date) {
      throw new Error('Date is required');
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error('Invalid date format');
    }

    // Reasonable date bounds (100 years in past/future)
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 100, 0, 1);
    const maxDate = new Date(now.getFullYear() + 100, 11, 31);

    if (parsed < minDate || parsed > maxDate) {
      throw new Error('Date outside reasonable bounds');
    }

    return parsed.toISOString();
  }
};

/**
 * Batch sanitization for arrays of similar objects
 */
export function batchSanitize(items, sanitizer) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  if (items.length > SECURITY_CONFIG.maxArrayLength) {
    throw new Error('Batch size exceeds maximum');
  }

  return items.map((item, index) => {
    try {
      return sanitizer(item);
    } catch (error) {
      console.warn(`Batch sanitization failed for item ${index}:`, error.message);
      return null;
    }
  }).filter(item => item !== null);
}

/**
 * Schema-based sanitization
 */
export function schemaSanitize(data, schema) {
  const sanitized = {};

  Object.entries(schema).forEach(([key, sanitizer]) => {
    if (data.hasOwnProperty(key)) {
      try {
        if (typeof sanitizer === 'function') {
          sanitized[key] = sanitizer(data[key]);
        } else if (typeof sanitizer === 'object' && sanitizer.sanitizer) {
          sanitized[key] = sanitizer.sanitizer(data[key]);
        } else {
          sanitized[key] = deepSanitize(data[key]);
        }
      } catch (error) {
        if (sanitizer.required !== false) {
          throw new Error(`Sanitization failed for required field '${key}': ${error.message}`);
        }
        // Skip optional fields that fail sanitization
        console.warn(`Optional field '${key}' sanitization failed:`, error.message);
      }
    } else if (sanitizer.required !== false) {
      throw new Error(`Required field '${key}' is missing`);
    }
  });

  return sanitized;
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Strict transport security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Content security policy
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://res.cloudinary.com https://maps.googleapis.com",
      "connect-src 'self' https://api.upstash.io https://maps.googleapis.com"
    ].join('; '));

    next();
  };
}