// Assembles the NextAuth configuration object from all sub-modules
import type { NextAuthOptions } from 'next-auth';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import {
  jwtCallback,
  redirectCallback,
  sessionCallback,
  signInCallback,
  authEvents,
} from './callbacks';
import { buildProviders } from './providers';
import { SESSION_MAX_AGE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from './utils';

// ── Environment pre-flight check ──────────────────────────────────────────────

const checkEnvironmentVariables = (): boolean => {
  const missingVars: string[] = [];

  if (!env.MONGODB_URI) {
    missingVars.push('MONGODB_URI');
  }

  if (!env.NEXTAUTH_SECRET) {
    if (env.NODE_ENV === 'production') {
      missingVars.push('NEXTAUTH_SECRET');
    } else {
      logger.warn('[Auth] NEXTAUTH_SECRET not set. Using development fallback behavior.');
    }
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    logger.warn('[Auth] Google OAuth credentials are missing. Google sign-in will be disabled.');
    logger.warn('[Auth] GOOGLE_CLIENT_ID:', env.GOOGLE_CLIENT_ID ? 'set' : 'missing');
    logger.warn('[Auth] GOOGLE_CLIENT_SECRET:', env.GOOGLE_CLIENT_SECRET ? 'set' : 'missing');
  } else {
    logger.info('[Auth] Google OAuth credentials are configured.');
  }

  if (!env.NEXTAUTH_URL) {
    if (env.NODE_ENV === 'production') {
      missingVars.push('NEXTAUTH_URL');
    } else {
      logger.warn('[Auth] NEXTAUTH_URL not set. Using localhost fallback for development.');
    }
  }

  if (missingVars.length > 0) {
    logger.error('[Auth] Missing required environment variables:', missingVars.join(', '));
    logger.error('[Auth] Check your .env.local file.');
  }

  return missingVars.length === 0;
};

const envCheck = checkEnvironmentVariables();
if (!envCheck) {
  logger.warn(
    '[Auth] Some environment variables are missing. Authentication may not work correctly.'
  );
}

// ── Cookie prefix (environment-dependent) ─────────────────────────────────────

const NEXTAUTH_COOKIE_PREFIX = env.NODE_ENV === 'production' ? '__Secure-' : '';

// ── Assembled authOptions ─────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),

  callbacks: {
    signIn: signInCallback,
    jwt: jwtCallback,
    session: sessionCallback,
    redirect: redirectCallback,
  },

  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },

  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  events: authEvents,

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
    error: '/auth/error',
    newUser: '/auth/signup',
  },

  debug: false,
  secret: env.NEXTAUTH_SECRET,
  useSecureCookies: env.NODE_ENV === 'production',

  cookies: {
    sessionToken: {
      name: `${NEXTAUTH_COOKIE_PREFIX}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
    callbackUrl: {
      name: `${NEXTAUTH_COOKIE_PREFIX}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
    csrfToken: {
      name: `${NEXTAUTH_COOKIE_PREFIX}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
  },
};
