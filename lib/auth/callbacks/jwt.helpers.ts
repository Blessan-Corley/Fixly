import type { JWT } from 'next-auth/jwt';

import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import User from '@/models/User';

import type { LeanSessionUser, SessionRefreshCache } from '../types';
import {
  CACHE_TTL_SECONDS,
  asOptionalAuthMethod,
  asOptionalRole,
  asOptionalString,
  computeRegistrationState,
  isDisabledAccount,
  isValidObjectId,
} from '../utils';

export async function refreshAuthState(token: JWT): Promise<JWT> {
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

      if (needsFreshData) cachedData = null;
    }

    if (!cachedData) {
      await connectDB();

      const userLookup: Array<Record<string, unknown>> = [];
      if (isValidObjectId(token.id)) userLookup.push({ _id: token.id });
      if (token.googleId) userLookup.push({ googleId: token.googleId });
      if (token.email) userLookup.push({ email: String(token.email).toLowerCase() });

      const dbUser =
        userLookup.length > 0
          ? await User.findOne({ $or: userLookup })
              .select(
                'role username isVerified emailVerified phoneVerified banned isActive deletedAt location skills subscription updatedAt authMethod phone passwordChangedAt'
              )
              .lean<LeanSessionUser | null>()
          : null;

      if (dbUser) {
        // If the password was changed after this token was issued, force re-auth
        const tokenIssuedAt = typeof token.iat === 'number' ? token.iat * 1000 : 0;
        const passwordChangedAt = (dbUser as unknown as { passwordChangedAt?: Date })
          .passwordChangedAt;
        if (passwordChangedAt && tokenIssuedAt < passwordChangedAt.getTime()) {
          return {
            ...token,
            id: undefined,
            role: undefined,
            username: undefined,
            email: undefined,
            isRegistered: false,
          };
        }

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
        // Preserve token.id so the Redis cache key stays valid on subsequent requests.
        // The session callback is the actual security boundary that nullifies session.user.id.
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

  return token;
}
