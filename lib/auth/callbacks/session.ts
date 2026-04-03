import type { NextAuthOptions } from 'next-auth';

import { logger } from '@/lib/logger';

import User from '../../../models/User';
import connectDB from '../../mongodb';
import { redisUtils } from '../../redis';
import type { LeanRoleUser, SessionUserCache } from '../types';
import {
  CACHE_TTL_SECONDS,
  asOptionalRole,
  asOptionalString,
  isDisabledAccount,
  isValidObjectId,
} from '../utils';

export const sessionCallback: NonNullable<NextAuthOptions['callbacks']>['session'] = async ({
  session,
  token,
}) => {
  if (session.user) {
    session.user.id = token.id;
    session.user.role = token.role;
    session.user.username = token.username;
    session.user.phone = token.phone;
    session.user.isVerified = token.isVerified;
    session.user.emailVerified = token.emailVerified;
    session.user.phoneVerified = token.phoneVerified;
    session.user.banned = token.banned;
    session.user.isActive = token.isActive;
    session.user.authMethod = token.authMethod;
    session.user.needsOnboarding = token.needsOnboarding;
    session.user.isRegistered = token.isRegistered;
    session.user.isNewUser = token.isNewUser;
    session.user.googleId = token.googleId;
    session.user.csrfToken = token.csrfToken;

    if (token.picture || token.image) {
      session.user.image = asOptionalString(token.picture) ?? asOptionalString(token.image);
    }

    if (isDisabledAccount(token.banned, token.isActive, token.deleted)) {
      session.user.id = undefined;
      session.user.role = undefined;
      session.user.username = undefined;
      session.user.phone = undefined;
      session.user.isRegistered = false;
      session.user.needsOnboarding = false;
      session.user.csrfToken = undefined;
      return session;
    }

    if (
      (token.isRegistered === false || token.needsOnboarding === true) &&
      !isValidObjectId(token.id)
    ) {
      return session;
    }

    if (isValidObjectId(token.id) && !session.user.role) {
      try {
        const cacheKey = `user_data:${token.id}`;
        let userData = await redisUtils.get<SessionUserCache>(cacheKey);

        if (!userData) {
          await connectDB();
          const dbUser = await User.findById(token.id)
            .select('role emailVerified phoneVerified isVerified banned isActive deletedAt')
            .lean<LeanRoleUser | null>();

          if (dbUser) {
            userData = {
              id: dbUser._id.toString(),
              role: asOptionalRole(dbUser.role),
              emailVerified: dbUser.emailVerified,
              phoneVerified: dbUser.phoneVerified,
              isVerified: dbUser.isVerified,
              banned: dbUser.banned,
              isActive: dbUser.isActive,
              deleted: Boolean(dbUser.deletedAt),
            };

            await redisUtils.set(cacheKey, userData, CACHE_TTL_SECONDS);
          }
        }

        if (userData?.role) {
          session.user.role = userData.role;
          session.user.emailVerified = userData.emailVerified;
          session.user.phoneVerified = userData.phoneVerified;
          session.user.isVerified = userData.isVerified;
          session.user.banned = userData.banned;
          session.user.isActive = userData.isActive;
          session.user.isRegistered = !isDisabledAccount(
            userData.banned,
            userData.isActive,
            userData.deleted
          );
          session.user.needsOnboarding = false;

          if (isDisabledAccount(userData.banned, userData.isActive, userData.deleted)) {
            session.user.id = undefined;
            session.user.role = undefined;
            session.user.username = undefined;
            session.user.phone = undefined;
          }
        }
      } catch (error) {
        logger.error('[Auth] Error fetching user data in session callback:', error);
      }
    }
  }

  return session;
};
