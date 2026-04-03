import { Types } from 'mongoose';
import { z } from 'zod';

import { requireSession, respond } from '@/lib/api';
import { parseBody } from '@/lib/api/parse';
import {
  buildPhoneLookupValues,
  computeIsFullyVerified,
  invalidateAuthCache,
  normalizeIndianPhone,
} from '@/lib/auth-utils';
import admin from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import type { AuthMethod, IUser } from '@/types/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const VerifyPhoneFirebaseSchema = z.object({
  idToken: z.string().min(1),
  phoneNumber: z.string().optional(),
});

type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification?: (
    type: string,
    title: string,
    message: string,
    data?: unknown
  ) => Promise<IUser>;
  save: () => Promise<unknown>;
};

type DecodedFirebaseToken = {
  uid?: string;
  phone_number?: string;
};

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function normalizeIndianNumber(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return null;
}

function isAccountBlocked(user: Pick<IUser, 'banned' | 'isActive' | 'deletedAt'>): boolean {
  return Boolean(user.banned || user.isActive === false || user.deletedAt);
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'phone_verify_firebase', 5, 15 * 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          { message: 'Phone verification is temporarily unavailable. Please try again shortly.' },
          503
        );
      }
      const retryAfter = Math.max(
        0,
        Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      );
      return respond(
        {
          message: 'Too many verification attempts. Please try again later.',
          retryAfter,
          resetTime: new Date(rateLimitResult.resetTime).toISOString(),
        },
        429,
        { headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = toTrimmedString(auth.session.user.id);
    if (!userId) {
      return respond({ message: 'Authentication required' }, 401);
    }

    const parsed = await parseBody(request, VerifyPhoneFirebaseSchema);
    if ('error' in parsed) {
      return parsed.error;
    }
    const idToken = parsed.data.idToken.trim();

    await connectDB();

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user) {
      return respond({ message: 'User not found' }, 404);
    }

    if (isAccountBlocked(user)) {
      return respond({ message: 'Account is suspended' }, 403);
    }

    if (user.phoneVerified) {
      return respond({ message: 'Phone number is already verified' }, 400);
    }

    let decodedToken: DecodedFirebaseToken;
    try {
      decodedToken = (await admin.auth().verifyIdToken(idToken)) as DecodedFirebaseToken;
    } catch (firebaseError: unknown) {
      logger.error('Firebase token verification error:', firebaseError);
      return respond(
        { message: 'Invalid or expired verification token' },
        401
      );
    }

    const decodedPhone = normalizeIndianPhone(decodedToken.phone_number);
    if (!decodedPhone) {
      return respond(
        { message: 'Verified token does not include a phone number' },
        400
      );
    }

    const providedPhone = normalizeIndianPhone(parsed.data.phoneNumber);
    const normalizedDecoded = normalizeIndianNumber(decodedPhone);
    const normalizedProvided = normalizeIndianNumber(providedPhone);

    if (normalizedProvided && normalizedDecoded && normalizedProvided !== normalizedDecoded) {
      return respond({ message: 'Phone number mismatch' }, 400);
    }

    const existingUser = await User.findOne({
      phone: { $in: buildPhoneLookupValues(decodedPhone) },
      _id: { $ne: user._id },
    })
      .select('_id')
      .lean();

    if (existingUser) {
      return respond(
        { message: 'Phone number is already in use by another account' },
        409
      );
    }

    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
    user.lastActivityAt = new Date();
    user.firebaseUid = toTrimmedString(decodedToken.uid) ?? user.firebaseUid;
    user.providers = Array.from(new Set<AuthMethod>([...(user.providers || []), 'phone']));

    user.phone = decodedPhone;

    user.isVerified = computeIsFullyVerified(user.emailVerified, user.phoneVerified);

    await user.save();
    await invalidateAuthCache(String(user._id));

    try {
      await user.addNotification?.(
        'phone_verified',
        'Phone Verified Successfully',
        user.isVerified
          ? 'Your account is now fully verified and ready to use!'
          : 'Your phone has been verified. Complete email verification to unlock all features.'
      );
    } catch (notificationError: unknown) {
      logger.warn('Phone verification notification error:', notificationError);
    }

    return respond({
      success: true,
      message: 'Phone number verified successfully',
      user: {
        phoneVerified: true,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        requiresEmailVerification: !user.emailVerified && user.authMethod === 'email',
      },
    });
  } catch (error: unknown) {
    logger.error('Phone verification server error:', error);
    return respond({ message: 'Phone verification failed' }, 500);
  }
}
