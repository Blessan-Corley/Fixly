// NextAuth provider configurations (Google OAuth + Credentials)
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { authSlidingRateLimit } from '@/lib/redis';

import User from '../../models/User';
import type { IUser } from '../../types/User';
import connectDB from '../mongodb';

import {
  AUTH_ERROR_ACCESS_DENIED,
  AUTH_ERROR_INVALID_CREDENTIALS,
  AUTH_ERROR_RATE_LIMITED,
  AUTH_ERROR_TEMPORARILY_UNAVAILABLE,
  LOGIN_RATE_LIMIT_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  asOptionalString,
  computeRegistrationState,
  getRequestIpFromCredentialsRequest,
  isEmailLike,
} from './utils';

// Cached dummy hash for timing-equalization on failed lookups.
// Generated once per serverless instance; purely ensures bcrypt runs whether
// or not the user account exists, preventing user-enumeration via response time.
let _dummyBcryptHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!_dummyBcryptHash) {
    _dummyBcryptHash = await bcrypt.hash('__fixly_timing_guard__', 12);
  }
  return _dummyBcryptHash;
}

export const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: 'select_account',
            response_type: 'code',
            scope: 'openid email profile',
          },
        },
      })
    : null;

export const credentialsProvider = CredentialsProvider({
  name: 'credentials',
  credentials: {
    identifier: { label: 'Email or Username', type: 'text' },
    password: { label: 'Password', type: 'password' },
    loginMethod: { label: 'Login Method', type: 'text' },
  },
  async authorize(credentials, request) {
    if (!credentials) return null;

    const identifier = asOptionalString(credentials.identifier)?.trim().toLowerCase();
    const password = asOptionalString(credentials.password);
    const loginMethod = asOptionalString(credentials.loginMethod);
    const clientIp = getRequestIpFromCredentialsRequest(request);

    if (!identifier || !password) {
      throw new Error(AUTH_ERROR_INVALID_CREDENTIALS);
    }

    try {
      const [emailLimitResult, ipLimitResult] = await Promise.all([
        authSlidingRateLimit(
          `login_attempts:identifier:${identifier}`,
          LOGIN_RATE_LIMIT_ATTEMPTS,
          LOGIN_RATE_LIMIT_WINDOW_SECONDS
        ),
        authSlidingRateLimit(
          `login_attempts:ip:${clientIp}`,
          LOGIN_RATE_LIMIT_ATTEMPTS * 2,
          LOGIN_RATE_LIMIT_WINDOW_SECONDS
        ),
      ]);

      if (!emailLimitResult.success || !ipLimitResult.success) {
        if (emailLimitResult.degraded || ipLimitResult.degraded) {
          throw new Error(AUTH_ERROR_TEMPORARILY_UNAVAILABLE);
        }
        logger.info('[Auth] Rate limit exceeded for login attempts:', identifier);
        throw new Error(AUTH_ERROR_RATE_LIMITED);
      }

      await connectDB();

      let userDoc: IUser | null = null;

      if (!loginMethod || loginMethod === 'email' || loginMethod === 'credentials') {
        userDoc = await User.findOne({
          $or: isEmailLike(identifier)
            ? [{ email: identifier }, { username: identifier }]
            : [{ username: identifier }, { email: identifier }],
        }).select('+passwordHash');

        // Always run bcrypt regardless of whether the account exists.
        // This equalizes response time and prevents user-enumeration
        // attacks via response-time analysis (timing oracle).
        const hashToCompare = userDoc?.passwordHash ?? (await getDummyHash());
        const isPasswordMatch = await bcrypt.compare(password, hashToCompare);

        if (
          !userDoc ||
          userDoc.authMethod === 'google' ||
          !userDoc.passwordHash ||
          !isPasswordMatch
        ) {
          throw new Error(AUTH_ERROR_INVALID_CREDENTIALS);
        }

        if (!userDoc.isRegistered && !userDoc.role) {
          throw new Error(AUTH_ERROR_INVALID_CREDENTIALS);
        }
      } else {
        throw new Error(AUTH_ERROR_INVALID_CREDENTIALS);
      }

      if (userDoc.banned) {
        throw new Error(AUTH_ERROR_ACCESS_DENIED);
      }

      if (!userDoc.isActive || userDoc.deletedAt) {
        throw new Error(AUTH_ERROR_ACCESS_DENIED);
      }

      userDoc.lastLoginAt = new Date();
      userDoc.lastActivityAt = new Date();
      await userDoc.save();

      if (env.NODE_ENV === 'development') {
        logger.info('[Auth] Credentials login successful for:', userDoc.email);
      }

      return {
        id: userDoc._id.toString(),
        email: userDoc.email,
        name: userDoc.name,
        role: userDoc.role,
        username: userDoc.username,
        phone: userDoc.phone,
        isVerified: userDoc.isVerified,
        emailVerified: userDoc.emailVerified,
        phoneVerified: userDoc.phoneVerified,
        banned: Boolean(userDoc.banned),
        isActive: Boolean(userDoc.isActive ?? true) && !userDoc.deletedAt,
        picture: userDoc.profilePhoto?.url || userDoc.picture,
        authMethod: userDoc.authMethod,
        isRegistered: computeRegistrationState(
          userDoc.role,
          userDoc.username,
          userDoc.isRegistered
        ),
      };
    } catch (error) {
      logger.error('[Auth] Credentials authorize error:', error);
      throw error;
    }
  },
});

export const buildProviders = (): NextAuthOptions['providers'] => [
  ...(googleProvider ? [googleProvider] : []),
  credentialsProvider,
];
