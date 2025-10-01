// lib/env-validation.js - Environment variable validation and security
export const ENV_CONFIG = {
  // Server-side only variables
  server: {
    MONGODB_URI: {
      required: true,
      validate: (value) => value?.startsWith('mongodb'),
      error: 'MONGODB_URI must be a valid MongoDB connection string'
    },
    NEXTAUTH_SECRET: {
      required: true,
      validate: (value) => value?.length >= 32,
      error: 'NEXTAUTH_SECRET must be at least 32 characters long'
    },
    ABLY_ROOT_KEY: {
      required: true,
      validate: (value) => value?.includes(':'),
      error: 'ABLY_ROOT_KEY must be a valid Ably root key'
    },
    CLOUDINARY_CLOUD_NAME: {
      required: true,
      validate: (value) => value?.length > 0,
      error: 'CLOUDINARY_CLOUD_NAME is required'
    },
    CLOUDINARY_API_KEY: {
      required: true,
      validate: (value) => /^\d+$/.test(value),
      error: 'CLOUDINARY_API_KEY must be numeric'
    },
    CLOUDINARY_API_SECRET: {
      required: true,
      validate: (value) => value?.length > 10,
      error: 'CLOUDINARY_API_SECRET is required'
    },
    GOOGLE_CLIENT_ID: {
      required: true,
      validate: (value) => value?.endsWith('.googleusercontent.com'),
      error: 'GOOGLE_CLIENT_ID must be a valid Google OAuth client ID'
    },
    GOOGLE_CLIENT_SECRET: {
      required: true,
      validate: (value) => value?.length > 0,
      error: 'GOOGLE_CLIENT_SECRET is required'
    },
    UPSTASH_REDIS_REST_URL: {
      required: false,
      validate: (value) => !value || value.startsWith('https://'),
      error: 'UPSTASH_REDIS_REST_URL must be a valid HTTPS URL'
    },
    UPSTASH_REDIS_REST_TOKEN: {
      required: false,
      validate: (value) => !value || value.length > 0,
      error: 'UPSTASH_REDIS_REST_TOKEN must be provided if URL is set'
    }
  },

  // Client-side variables (NEXT_PUBLIC_*)
  client: {
    NEXT_PUBLIC_ABLY_CLIENT_KEY: {
      required: true,
      validate: (value) => value?.includes(':') && !value.includes('root'),
      error: 'NEXT_PUBLIC_ABLY_CLIENT_KEY must be a client-only key (not root key)',
      security: 'Ensure this is a subscribe-only key'
    },
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: {
      required: false,
      validate: (value) => !value || value.startsWith('AIza'),
      error: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must be a valid Google Maps API key',
      security: 'Restrict this key to specific domains and APIs in Google Console'
    },
    NEXT_PUBLIC_FIREBASE_API_KEY: {
      required: false,
      validate: (value) => !value || value.startsWith('AIza'),
      error: 'NEXT_PUBLIC_FIREBASE_API_KEY must be a valid Firebase API key',
      security: 'This key is safe to expose as it identifies the project, not authenticates it'
    },
    NEXT_PUBLIC_RAZORPAY_KEY_ID: {
      required: false,
      validate: (value) => !value || value.startsWith('rzp_'),
      error: 'NEXT_PUBLIC_RAZORPAY_KEY_ID must be a valid Razorpay key ID',
      security: 'This is the public key ID, not the secret key'
    }
  }
};

// Validate server environment variables
export function validateServerEnv() {
  const errors = [];
  const warnings = [];

  for (const [key, config] of Object.entries(ENV_CONFIG.server)) {
    const value = process.env[key];

    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }

    if (value && config.validate && !config.validate(value)) {
      errors.push(`Invalid ${key}: ${config.error}`);
    }
  }

  // Check for potential security issues
  if (process.env.ABLY_ROOT_KEY && process.env.ABLY_ROOT_KEY === process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY) {
    errors.push('SECURITY: Root Ably key exposed as client key!');
  }

  // Validate required production settings
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXTAUTH_URL) {
      errors.push('NEXTAUTH_URL is required in production');
    } else if (!process.env.NEXTAUTH_URL.startsWith('https://')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production');
    }

    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters in production');
    }
  }

  // Check for insecure fallbacks in code
  const insecureFallbacks = [
    'rzp_test_mock',
    'your-api-key',
    'localhost',
    'development-key'
  ];

  for (const [key, config] of Object.entries(ENV_CONFIG.server)) {
    const value = process.env[key];
    if (value && insecureFallbacks.some(fallback => value.includes(fallback))) {
      warnings.push(`${key} appears to contain a development/mock value: ${value.substring(0, 20)}...`);
    }
  }

  return { errors, warnings };
}

// Validate client environment variables
export function validateClientEnv() {
  const errors = [];
  const warnings = [];

  for (const [key, config] of Object.entries(ENV_CONFIG.client)) {
    const value = process.env[key];

    if (config.required && !value) {
      errors.push(`Missing required client environment variable: ${key}`);
      continue;
    }

    if (value && config.validate && !config.validate(value)) {
      errors.push(`Invalid ${key}: ${config.error}`);
    }

    if (value && config.security) {
      warnings.push(`Security note for ${key}: ${config.security}`);
    }
  }

  return { errors, warnings };
}

// Get sanitized environment variables for client
export function getClientEnv() {
  const clientEnv = {};

  for (const key of Object.keys(ENV_CONFIG.client)) {
    if (process.env[key]) {
      clientEnv[key] = process.env[key];
    }
  }

  return clientEnv;
}

// Environment health check
export function envHealthCheck() {
  const serverValidation = validateServerEnv();
  const clientValidation = validateClientEnv();

  const allErrors = [...serverValidation.errors, ...clientValidation.errors];
  const allWarnings = [...serverValidation.warnings, ...clientValidation.warnings];

  return {
    isHealthy: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      total: Object.keys(ENV_CONFIG.server).length + Object.keys(ENV_CONFIG.client).length,
      configured: Object.keys(process.env).filter(key =>
        Object.keys(ENV_CONFIG.server).includes(key) || Object.keys(ENV_CONFIG.client).includes(key)
      ).length,
      missing: allErrors.filter(e => e.includes('Missing')).length,
      invalid: allErrors.filter(e => e.includes('Invalid')).length
    }
  };
}

// Validate on import for immediate feedback
if (typeof window === 'undefined') {
  // Server-side validation
  const validation = validateServerEnv();
  if (validation.errors.length > 0) {
    console.error('❌ Environment Variable Validation Errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment Variable Warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
} else {
  // Client-side validation
  const validation = validateClientEnv();
  if (validation.errors.length > 0) {
    console.error('❌ Client Environment Variable Errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }
}