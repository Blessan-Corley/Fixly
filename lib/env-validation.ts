import { env } from '@/lib/env';
type Validator = (value: string | undefined) => boolean;

interface EnvRule {
  required: boolean;
  validate: Validator;
  error: string;
  security?: string;
}

type EnvRuleSet = Record<string, EnvRule>;

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

interface EnvHealthSummary {
  total: number;
  configured: number;
  missing: number;
  invalid: number;
}

export interface EnvHealthReport extends ValidationResult {
  isHealthy: boolean;
  summary: EnvHealthSummary;
}

export const ENV_CONFIG: { server: EnvRuleSet; client: EnvRuleSet } = {
  server: {
    MONGODB_URI: {
      required: true,
      validate: (value) => Boolean(value?.startsWith('mongodb')),
      error: 'MONGODB_URI must be a valid MongoDB connection string',
    },
    NEXTAUTH_SECRET: {
      required: true,
      validate: (value) => Boolean(value && value.length >= 32),
      error: 'NEXTAUTH_SECRET must be at least 32 characters long',
    },
    ABLY_ROOT_KEY: {
      required: true,
      validate: (value) => Boolean(value?.includes(':')),
      error: 'ABLY_ROOT_KEY must be a valid Ably root key',
    },
    CLOUDINARY_CLOUD_NAME: {
      required: true,
      validate: (value) => Boolean(value && value.length > 0),
      error: 'CLOUDINARY_CLOUD_NAME is required',
    },
    CLOUDINARY_API_KEY: {
      required: true,
      validate: (value) => Boolean(value && /^\d+$/.test(value)),
      error: 'CLOUDINARY_API_KEY must be numeric',
    },
    CLOUDINARY_API_SECRET: {
      required: true,
      validate: (value) => Boolean(value && value.length > 10),
      error: 'CLOUDINARY_API_SECRET is required',
    },
    GOOGLE_CLIENT_ID: {
      required: true,
      validate: (value) => Boolean(value?.endsWith('.googleusercontent.com')),
      error: 'GOOGLE_CLIENT_ID must be a valid Google OAuth client ID',
    },
    GOOGLE_CLIENT_SECRET: {
      required: true,
      validate: (value) => Boolean(value && value.length > 0),
      error: 'GOOGLE_CLIENT_SECRET is required',
    },
    REDIS_URL: {
      required: false,
      validate: (value) => !value || value.startsWith('redis://') || value.startsWith('rediss://'),
      error: 'REDIS_URL must be a valid redis:// or rediss:// connection string',
    },
  },

  client: {
    NEXT_PUBLIC_ABLY_CLIENT_KEY: {
      required: true,
      validate: (value) => Boolean(value?.includes(':') && !value.includes('root')),
      error: 'NEXT_PUBLIC_ABLY_CLIENT_KEY must be a client-only key (not root key)',
      security: 'Ensure this is a subscribe-only key',
    },
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: {
      required: false,
      validate: (value) => !value || value.startsWith('AIza'),
      error: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must be a valid Google Maps API key',
      security: 'Restrict this key to specific domains and APIs in Google Console',
    },
    NEXT_PUBLIC_FIREBASE_API_KEY: {
      required: false,
      validate: (value) => !value || value.startsWith('AIza'),
      error: 'NEXT_PUBLIC_FIREBASE_API_KEY must be a valid Firebase API key',
      security: 'This key is safe to expose as it identifies the project, not authenticates it',
    },
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
      required: false,
      validate: (value) => !value || value.startsWith('pk_'),
      error: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a valid Stripe publishable key',
      security:
        'This key is public by design, but still should be restricted by origin in Stripe settings',
    },
  },
};

const toEnvString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
};

const getTypedEnvSource = (): Record<string, string | undefined> => ({
  MONGODB_URI: toEnvString(env.MONGODB_URI),
  NEXTAUTH_SECRET: toEnvString(env.NEXTAUTH_SECRET),
  ABLY_ROOT_KEY: toEnvString(env.ABLY_ROOT_KEY),
  CLOUDINARY_CLOUD_NAME: toEnvString(env.CLOUDINARY_CLOUD_NAME),
  CLOUDINARY_API_KEY: toEnvString(env.CLOUDINARY_API_KEY),
  CLOUDINARY_API_SECRET: toEnvString(env.CLOUDINARY_API_SECRET),
  GOOGLE_CLIENT_ID: toEnvString(env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: toEnvString(env.GOOGLE_CLIENT_SECRET),
  REDIS_URL: toEnvString(env.REDIS_URL),
  NEXT_PUBLIC_ABLY_CLIENT_KEY: toEnvString(env.NEXT_PUBLIC_ABLY_CLIENT_KEY),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: toEnvString(env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
  NEXT_PUBLIC_FIREBASE_API_KEY: toEnvString(env.NEXT_PUBLIC_FIREBASE_API_KEY),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: toEnvString(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
});

function validateRuleSet(
  ruleSet: EnvRuleSet,
  source: Record<string, string | undefined>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, rule] of Object.entries(ruleSet)) {
    const value = source[key];

    if (rule.required && !value) {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }

    if (value && !rule.validate(value)) {
      errors.push(`Invalid ${key}: ${rule.error}`);
    }

    if (value && rule.security) {
      warnings.push(`Security note for ${key}: ${rule.security}`);
    }
  }

  return { errors, warnings };
}

export function validateServerEnv(): ValidationResult {
  const source = getTypedEnvSource();
  const { errors, warnings } = validateRuleSet(ENV_CONFIG.server, source);

  if (env.ABLY_ROOT_KEY && env.ABLY_ROOT_KEY === env.NEXT_PUBLIC_ABLY_CLIENT_KEY) {
    errors.push('SECURITY: Root Ably key exposed as client key');
  }

  if (env.NODE_ENV === 'production' && env.NEXTAUTH_URL) {
    if (!env.NEXTAUTH_URL.startsWith('https://') && !env.NEXTAUTH_URL.includes('localhost')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production');
    }

    if (!env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters in production');
    }
  }

  const insecureFallbacks = ['test_mock', 'your-api-key', 'localhost', 'development-key'];

  for (const key of Object.keys(ENV_CONFIG.server)) {
    const value = source[key];
    if (value && insecureFallbacks.some((fallback) => value.includes(fallback))) {
      warnings.push(`${key} appears to contain a development/mock value: ${value.slice(0, 20)}...`);
    }
  }

  return { errors, warnings };
}

export function validateClientEnv(): ValidationResult {
  return validateRuleSet(ENV_CONFIG.client, getTypedEnvSource());
}

export function getClientEnv(): Record<string, string> {
  const source = getTypedEnvSource();
  const clientEnv: Record<string, string> = {};

  for (const key of Object.keys(ENV_CONFIG.client)) {
    const value = source[key];
    if (value) {
      clientEnv[key] = value;
    }
  }

  return clientEnv;
}

export function envHealthCheck(): EnvHealthReport {
  const serverValidation = validateServerEnv();
  const clientValidation = validateClientEnv();

  const allErrors = [...serverValidation.errors, ...clientValidation.errors];
  const allWarnings = [...serverValidation.warnings, ...clientValidation.warnings];

  const allKeys = [...Object.keys(ENV_CONFIG.server), ...Object.keys(ENV_CONFIG.client)];
  const source = getTypedEnvSource();
  const configuredCount = allKeys.filter((key) => Boolean(source[key])).length;

  return {
    isHealthy: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      total: allKeys.length,
      configured: configuredCount,
      missing: allErrors.filter((error) => error.includes('Missing')).length,
      invalid: allErrors.filter((error) => error.includes('Invalid')).length,
    },
  };
}

if (typeof window === 'undefined') {
  const validation = validateServerEnv();
  if (validation.errors.length > 0) {
    console.error('Environment variable validation errors:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
  }
  if (validation.warnings.length > 0) {
    console.warn('Environment variable warnings:');
    validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }
} else {
  const validation = validateClientEnv();
  if (validation.errors.length > 0) {
    console.error('Client environment variable errors:');
    validation.errors.forEach((error) => console.error(`  - ${error}`));
  }
}
