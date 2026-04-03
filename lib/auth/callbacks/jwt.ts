import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';

import { logger } from '@/lib/logger';
import { generateCsrfToken } from '@/lib/security/csrf.server';

import User from '../../../models/User';
import connectDB from '../../mongodb';
import { redisUtils } from '../../redis';
import type { LeanSessionUser, SessionRefreshCache } from '../types';
import {
  CACHE_TTL_SECONDS,
  asOptionalAuthMethod,
  asOptionalRole,
  asOptionalString,
  computeRegistrationState,
  isDisabledAccount,
  isNonEmptyString,
  isValidObjectId,
} from '../utils';

const PENDING_GOOGLE_SESSION_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export const jwtCallback: NonNullable<NextAuthOptions['callbacks']>['jwt'] = async ({
  token,
  user,
  account,
  trigger,
  session,
}) => {
  // Expire pending Google signup sessions after 1 hour
  if (
    typeof token.id === 'string' &&
    token.id.startsWith('pending_google:') &&
    typeof token.pendingSessionCreatedAt === 'number' &&
    Date.now() - token.pendingSessionCreatedAt > PENDING_GOOGLE_SESSION_MAX_AGE_MS
  ) {
    token.id = undefined;
    token.googleId = undefined;
    token.email = undefined;
    token.name = undefined;
    token.image = undefined;
    token.isRegistered = false;
    token.isNewUser = false;
    token.pendingSessionCreatedAt = undefined;
    return token;
  }

  if (trigger === 'signIn' || !isNonEmptyString(token.csrfToken)) {
    token.csrfToken = generateCsrfToken();
  }

  if (account?.provider === 'google') {
    token.googleId = account.providerAccountId;
  }

  if (user) {
    const userWithPicture = user as NextAuthUser & {
      picture?: string;
      banned?: boolean;
      isActive?: boolean;
    };

    token.id = user.id ?? undefined;
    token.email = user.email;
    token.name = user.name;
    token.image = user.image ?? userWithPicture.picture;
    token.role = user.role || undefined;
    token.username = user.username;
    token.phone = user.phone;
    token.isVerified = user.isVerified === true;
    token.emailVerified = user.emailVerified === true;
    token.phoneVerified = user.phoneVerified === true;
    token.authMethod = user.authMethod || (account?.provider === 'google' ? 'google' : 'email');
    token.needsOnboarding = user.needsOnboarding || false;
    token.isRegistered = user.isRegistered || false;
    token.isNewUser = user.isNewUser || false;
    token.googleId = user.googleId || token.googleId;
    token.banned = userWithPicture.banned === true;
    token.isActive = userWithPicture.isActive !== false;
    token.deleted = false;
    token.authDataRefreshedAt = Date.now();
    token.csrfToken = isNonEmptyString(user.csrfToken) ? user.csrfToken : token.csrfToken;

    // Record creation time for pending Google sessions so we can expire them
    if (typeof token.id === 'string' && token.id.startsWith('pending_google:')) {
      token.pendingSessionCreatedAt = Date.now();
    }
  }

  if (trigger === 'update' && session && typeof session === 'object' && 'user' in session) {
    const updatedUser = (session as { user?: Record<string, unknown> }).user;

    if (updatedUser) {
      const nextName = asOptionalString(updatedUser.name);
      const nextImage = asOptionalString(updatedUser.image);

      if (nextName) token.name = nextName;
      if (nextImage) token.image = nextImage;
    }
  }

  const shouldRefreshAuthState =
    (isValidObjectId(token.id) || token.email || token.googleId) &&
    (trigger === 'update' ||
      typeof token.authDataRefreshedAt !== 'number' ||
      Date.now() - token.authDataRefreshedAt > CACHE_TTL_SECONDS * 1000 ||
      !token.role ||
      token.banned === true ||
      token.isActive === false);

  if (shouldRefreshAuthState) {
    try {
      let cachedData: SessionRefreshCache | null = null;
      let dbLookupUserId: string | undefined;

      if (isValidObjectId(token.id)) {
        dbLookupUserId = token.id;
        const cacheKey = `user_session:${token.id}`;
        const cachedValue = await redisUtils.get<SessionRefreshCache>(cacheKey);
        cachedData = typeof cachedValue === 'object' && cachedValue !== null ? cachedValue : null;

        const cacheAge = cachedData
          ? Date.now() - cachedData.lastUpdated
          : Number.POSITIVE_INFINITY;
        const needsFreshData =
          !cachedData ||
          (token.sessionVersion && cachedData.sessionVersion !== token.sessionVersion) ||
          cacheAge > CACHE_TTL_SECONDS * 1000;

        if (needsFreshData) {
          cachedData = null;
        }
      }

      if (!cachedData) {
        await connectDB();

        const userLookup: Array<Record<string, unknown>> = [];
        if (isValidObjectId(token.id)) {
          userLookup.push({ _id: token.id });
        }
        if (token.googleId) {
          userLookup.push({ googleId: token.googleId });
        }
        if (token.email) {
          userLookup.push({ email: String(token.email).toLowerCase() });
        }

        const dbUser =
          userLookup.length > 0
            ? await User.findOne({ $or: userLookup })
                .select(
                  'role username isVerified emailVerified phoneVerified banned isActive deletedAt location skills subscription updatedAt authMethod phone'
                )
                .lean<LeanSessionUser | null>()
            : null;

        if (dbUser) {
          dbLookupUserId = dbUser._id.toString();
          const userData: SessionRefreshCache = {
            id: dbLookupUserId,
            role: asOptionalRole(dbUser.role),
            username: dbUser.username,
            isVerified: dbUser.isVerified,
            emailVerified: dbUser.emailVerified,
            phoneVerified: dbUser.phoneVerified,
            banned: dbUser.banned,
            isActive: dbUser.isActive,
            deleted: Boolean(dbUser.deletedAt),
            location: dbUser.location,
            skills: dbUser.skills,
            subscription: dbUser.subscription,
            sessionVersion: dbUser.updatedAt?.getTime() ?? Date.now(),
            lastUpdated: Date.now(),
          };

          await redisUtils.set(`user_session:${dbLookupUserId}`, userData, CACHE_TTL_SECONDS);
          cachedData = userData;
          token.id = dbLookupUserId;
          token.authMethod = asOptionalAuthMethod(dbUser.authMethod) ?? token.authMethod;
          token.phone = asOptionalString(dbUser.phone) ?? token.phone;
        }
      }

      if (cachedData) {
        token.role = cachedData.role;
        token.username = cachedData.username;
        token.isVerified = cachedData.isVerified;
        token.emailVerified = cachedData.emailVerified;
        token.phoneVerified = cachedData.phoneVerified;
        token.banned = cachedData.banned;
        token.isActive = cachedData.isActive;
        token.deleted = cachedData.deleted;
        token.location = cachedData.location;
        token.skills = cachedData.skills;
        token.subscription = cachedData.subscription;
        token.sessionVersion = cachedData.sessionVersion;
        token.isRegistered = computeRegistrationState(cachedData.role, cachedData.username, true);
        token.needsOnboarding = !token.isRegistered;
        token.authDataRefreshedAt = Date.now();

        if (isDisabledAccount(token.banned, token.isActive, token.deleted)) {
          // Preserve token.id so the Redis cache key stays valid on subsequent requests —
          // without it, every request triggers a fresh DB lookup. The session callback is
          // the actual security boundary: it nullifies session.user.id when the account is
          // disabled, which blocks requireSession() and all API access.
          token.role = undefined;
          token.username = undefined;
          token.phone = undefined;
          token.isRegistered = false;
          token.needsOnboarding = false;
        }
      }
    } catch (error) {
      logger.error('[Auth] Error refreshing JWT token:', error);
    }
  }

  return token;
};
