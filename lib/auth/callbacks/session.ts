import type { NextAuthOptions } from 'next-auth';

import { asOptionalString, isDisabledAccount } from '../utils';

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
    session.user.hasGoogleAuth = Boolean(token.googleId);
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
  }

  return session;
};
