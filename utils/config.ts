import { env } from '@/lib/env';
/**
 * Centralized configuration utility
 * Handles environment-specific URLs and settings
 */

export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  if (env.NODE_ENV === 'development' && !env.NEXTAUTH_URL) {
    return 'http://localhost:3000';
  }

  if (env.NEXTAUTH_URL) {
    return env.NEXTAUTH_URL;
  }

  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }

  return 'https://fixly.app';
};

export const IS_PROD = env.NODE_ENV === 'production';
export const IS_DEV = env.NODE_ENV === 'development';
