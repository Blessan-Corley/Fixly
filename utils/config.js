/**
 * Centralized configuration utility
 * Handles environment-specific URLs and settings
 */

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Explicitly prefer localhost in development if NEXTAUTH_URL is not set
  if (process.env.NODE_ENV === 'development' && !process.env.NEXTAUTH_URL) {
    return 'http://localhost:3000';
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Production fallback
  return 'https://fixly.app';
};

export const IS_PROD = process.env.NODE_ENV === 'production';
export const IS_DEV = process.env.NODE_ENV === 'development';