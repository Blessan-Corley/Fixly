import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';

import { generateCsrfToken } from '@/lib/security/csrf.server';

import { CACHE_TTL_SECONDS, asOptionalString, isNonEmptyString, isValidObjectId } from '../utils';

import { refreshAuthState } from './jwt.helpers';

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
    return refreshAuthState(token);
  }

  return token;
};
