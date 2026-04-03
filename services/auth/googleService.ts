import {
  buildPhoneLookupValues,
  computeIsFullyVerified,
  normalizeIndianPhone,
} from '../../lib/auth-utils';
import User from '../../models/User';
import { SignupRequest, SignupResponse } from '../../types/Auth';
import { AuthMethod, UserLocation } from '../../types/User';

import { normalizeSignupLocation } from './signupLocation';

type SessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  googleId?: string;
  role?: string;
  isRegistered?: boolean;
};

type GoogleBackedUser = {
  _id: { toString(): string };
  name: string;
  email: string;
  username: string;
  role?: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  isVerified: boolean;
  isRegistered: boolean;
  providers?: AuthMethod[];
  googleId?: string;
  picture?: string;
  profilePhoto?: {
    url?: string | null;
    source?: string;
    lastUpdated?: Date;
  };
  location?: UserLocation;
  skills?: string[];
  phoneVerifiedAt?: Date;
  profileCompletedAt?: Date;
  authMethod?: AuthMethod;
  plan?: {
    type: string;
    status: string;
    creditsUsed: number;
    startDate?: Date;
  };
  save: () => Promise<unknown>;
};

function normalizeEmail(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getGoogleAccountId(sessionUser: SessionUser | null): string {
  if (!sessionUser) {
    return '';
  }

  if (typeof sessionUser.googleId === 'string' && sessionUser.googleId.trim()) {
    return sessionUser.googleId.trim();
  }

  if (typeof sessionUser.id === 'string' && sessionUser.id.startsWith('pending_google:')) {
    return sessionUser.id.slice('pending_google:'.length);
  }

  return '';
}

function createDefaultName(sessionUser: SessionUser, email: string): string {
  if (typeof sessionUser.name === 'string' && sessionUser.name.trim()) {
    return sessionUser.name.trim();
  }

  return email.split('@')[0] || 'User';
}

export class GoogleAuthService {
  static async completeProfile(
    data: SignupRequest,
    sessionUser: SessionUser | null
  ): Promise<SignupResponse> {
    const normalizedEmail = normalizeEmail(sessionUser?.email);
    const googleAccountId = getGoogleAccountId(sessionUser);

    if (!sessionUser || !normalizedEmail || !googleAccountId) {
      return { success: false, message: 'Invalid session' };
    }

    const normalizedPhone = normalizeIndianPhone(data.phone);
    const normalizedUsername =
      typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
    if (!normalizedPhone) {
      return { success: false, message: 'A valid phone number is required' };
    }

    if (!normalizedUsername) {
      return { success: false, message: 'A valid username is required' };
    }

    let user = (await User.findByEmailOrGoogleId(
      normalizedEmail,
      googleAccountId
    )) as GoogleBackedUser | null;

    if (user?.isRegistered) {
      return { success: false, message: 'Account already exists. Please sign in instead.' };
    }

    const existingPhoneOwner = await User.findOne({
      phone: { $in: buildPhoneLookupValues(normalizedPhone) },
      ...(user?._id ? { _id: { $ne: user._id } } : {}),
    })
      .select('_id')
      .lean();

    if (existingPhoneOwner) {
      return { success: false, message: 'Phone number already exists' };
    }

    const existingUsernameOwner = await User.findOne({
      username: normalizedUsername,
      ...(user?._id ? { _id: { $ne: user._id } } : {}),
    })
      .select('_id')
      .lean();

    if (existingUsernameOwner) {
      return { success: false, message: 'Username taken' };
    }

    if (user?.role && user.role !== data.role) {
      return { success: false, message: 'Account role is already locked and cannot be changed' };
    }

    const normalizedLocation = normalizeSignupLocation(data.location);
    const normalizedSkills = data.role === 'fixer' ? data.skills || [] : undefined;

    if (!user) {
      user = new User({
        name: createDefaultName(sessionUser, normalizedEmail),
        email: normalizedEmail,
        username: normalizedUsername,
        googleId: googleAccountId,
        picture: sessionUser.image || undefined,
        profilePhoto: sessionUser.image
          ? {
              url: sessionUser.image,
              source: 'google',
              lastUpdated: new Date(),
            }
          : undefined,
        authMethod: 'google',
        providers: ['google'],
        role: data.role,
        phone: normalizedPhone,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        phoneVerified: false,
        isVerified: computeIsFullyVerified(true, false),
        isRegistered: true,
        profileCompletedAt: new Date(),
        plan: {
          type: 'free',
          status: 'active',
          creditsUsed: 0,
          startDate: new Date(),
        },
      }) as GoogleBackedUser;
    } else {
      user.role = user.role || data.role;
      user.phone = normalizedPhone;
      user.username = normalizedUsername;
      user.googleId = user.googleId || googleAccountId;
      user.picture = user.picture || sessionUser.image || undefined;
      if (!user.profilePhoto?.url && sessionUser.image) {
        user.profilePhoto = {
          url: sessionUser.image,
          source: 'google',
          lastUpdated: new Date(),
        };
      }

      user.emailVerified = true;
      user.phoneVerified = false;
      user.phoneVerifiedAt = undefined;
      user.isVerified = computeIsFullyVerified(user.emailVerified, user.phoneVerified);
      user.isRegistered = true;
      user.profileCompletedAt = new Date();
      user.authMethod = 'google';
      user.providers = Array.from(new Set<AuthMethod>([...(user.providers || []), 'google']));
    }

    if (normalizedSkills) {
      user.skills = normalizedSkills;
    }

    if (data.location) {
      if (normalizedLocation) {
        user.location = normalizedLocation;
      }
    }

    await user.save();

    return {
      success: true,
      message: 'Profile completed',
      user: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role || data.role,
        isRegistered: true,
        authMethod: 'google',
        isVerified: Boolean(user.isVerified),
      },
    };
  }
}
