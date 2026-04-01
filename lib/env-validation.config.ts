type Validator = (value: string | undefined) => boolean;

export interface EnvRule {
  required: boolean;
  validate: Validator;
  error: string;
  security?: string;
}

export type EnvRuleSet = Record<string, EnvRule>;

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
    NEXT_PUBLIC_RAZORPAY_KEY_ID: {
      required: false,
      validate: (value) => !value || value.startsWith('rzp_'),
      error: 'NEXT_PUBLIC_RAZORPAY_KEY_ID must be a valid Razorpay key ID',
      security:
        'This key is public by design, but should be restricted by origin in Razorpay settings',
    },
  },
};
