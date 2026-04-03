import type { NextAuthOptions, Profile } from 'next-auth';

import { logger } from '@/lib/logger';

import User from '../../../models/User';
import { computeIsFullyVerified } from '../../auth-utils';
import connectDB from '../../mongodb';
import {
  computeRegistrationState,
  getAuthContextFromCookie,
  getProfileEmail,
  getProfileName,
  getProfilePicture,
  getPendingGoogleSessionId,
} from '../utils';

export const signInCallback: NonNullable<NextAuthOptions['callbacks']>['signIn'] = async ({
  user,
  account,
  profile,
}) => {
  if (account?.provider !== 'google') {
    return true;
  }

  try {
    const authContext = await getAuthContextFromCookie();
    const callbackUser = user as {
      email?: string | null;
      name?: string | null;
      image?: string | null;
      picture?: string | null;
    };
    const profileEmail = getProfileEmail(profile as Profile | null, callbackUser);
    const profileName = getProfileName(profile as Profile | null, callbackUser);
    const profilePicture = getProfilePicture(profile as Profile | null, callbackUser);

    await connectDB();

    const googleAccountUser = await User.findOne({ googleId: account.providerAccountId });
    const emailAccountUser =
      profileEmail && (!googleAccountUser || googleAccountUser.email !== profileEmail)
        ? await User.findOne({ email: profileEmail })
        : null;

    const existingUser = googleAccountUser ?? emailAccountUser;

    if (existingUser) {
      if (existingUser.banned) {
        return '/auth/error?error=AccountSuspended';
      }

      if (!existingUser.isActive || existingUser.deletedAt) {
        return '/auth/error?error=AccountInactive';
      }

      if (!googleAccountUser && emailAccountUser) {
        const encodedEmail = encodeURIComponent(profileEmail ?? '');
        if (authContext === 'signin') {
          return `/auth/error?error=UseEmailSignIn&email=${encodedEmail}`;
        }
        return `/auth/error?error=EmailAlreadyRegistered&email=${encodedEmail}`;
      }

      const updateData: Record<string, unknown> = {
        picture: profilePicture,
        'profilePhoto.url': profilePicture,
        'profilePhoto.lastUpdated': new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      };

      await User.findByIdAndUpdate(existingUser._id, updateData);

      const nextEmailVerified = existingUser.emailVerified || Boolean(existingUser.googleId);
      const nextPhoneVerified = Boolean(existingUser.phoneVerified);
      const nextIsVerified = computeIsFullyVerified(nextEmailVerified, nextPhoneVerified);

      user.id = existingUser._id.toString();
      user.role = existingUser.role;
      user.username = existingUser.username;
      user.phone = existingUser.phone;
      user.isVerified = nextIsVerified;
      user.emailVerified = nextEmailVerified;
      user.phoneVerified = nextPhoneVerified;
      user.authMethod = existingUser.authMethod || 'google';
      user.isRegistered = computeRegistrationState(
        existingUser.role,
        existingUser.username,
        existingUser.isRegistered
      );
      user.needsOnboarding = !user.isRegistered;
      user.banned = Boolean(existingUser.banned);
      user.isActive = Boolean(existingUser.isActive ?? true) && !existingUser.deletedAt;

      if (authContext === 'signup') {
        logger.info('[Auth] Existing Google user attempted signup; continuing as sign-in.');
      }

      return true;
    }

    if (authContext === 'signin') {
      const encodedEmail = encodeURIComponent(profileEmail ?? '');
      const encodedName = encodeURIComponent(profileName ?? '');
      return `/auth/error?error=AccountNotFound&email=${encodedEmail}&name=${encodedName}`;
    }

    if (!profileEmail || !profileEmail.includes('@')) {
      return '/auth/error?error=InvalidEmail';
    }

    user.id = getPendingGoogleSessionId(account.providerAccountId);
    user.isRegistered = false;
    user.needsOnboarding = true;
    user.isNewUser = true;
    user.authMethod = 'google';
    user.emailVerified = true;
    user.phoneVerified = false;
    user.isVerified = false;
    user.googleId = account.providerAccountId;
    user.username = undefined;
    user.phone = undefined;
    user.banned = false;
    user.isActive = true;

    return true;
  } catch (error) {
    logger.error('[Auth] Google sign-in error:', error);
    return '/auth/error?error=ServiceUnavailable';
  }
};
