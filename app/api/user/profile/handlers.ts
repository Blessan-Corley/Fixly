import { z } from 'zod';

import {
  badRequest,
  forbidden,
  notFound,
  parseBody,
  requireSession,
  respond,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { mapProfileResponse, mapUpdatedProfileResponse } from '@/lib/services/user/profile.mapper';
import { applyProfileUpdates, prepareProfileUpdates } from '@/lib/services/user/profile.mutations';
import { getCurrentUser, getCurrentUserDocument } from '@/lib/services/user/profile.queries';
import {
  isTemporarySessionId,
  parseError,
  parseProfileUpdateBody,
  toTrimmedString,
  type SessionUser,
} from '@/lib/services/user/profile.schema';
import { rateLimit } from '@/utils/rateLimiting';

const PROFILE_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
  'CDN-Cache-Control': 'max-age=60',
  Vary: 'Cookie',
};

type AuthResult = { session: { user?: SessionUser } };

/** Shared session + ID guards used by both GET and PUT. */
function guardSession(
  auth: AuthResult
): Response | { sessionUserId: string; session: { user?: SessionUser } } {
  const session = auth.session as { user?: SessionUser };
  const sessionUserId = toTrimmedString(session.user?.id);
  if (!sessionUserId) {
    return respond({ message: 'Invalid session. Please sign in again.', needsReauth: true }, 401);
  }
  if (isTemporarySessionId(sessionUserId)) {
    return respond(
      { message: 'Session not properly established. Please complete signup.', needsReauth: true, needsSignup: true },
      401
    );
  }
  return { sessionUserId, session };
}

export async function handleGetProfile(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'user_profile', 100, 60 * 1000);
    if (!rateLimitResult.success) return tooManyRequests('Too many requests. Please try again later.');

    const auth = await requireSession();
    if ('error' in auth) return unauthorized();

    const guarded = guardSession(auth as AuthResult);
    if (guarded instanceof Response) return guarded;
    const { sessionUserId, session } = guarded;

    if (session.user?.isRegistered === false || session.user?.needsOnboarding === true) {
      return respond({
        message: 'Profile incomplete. Please complete signup first.',
        needsCompletion: true,
        user: { name: session.user?.name ?? null, email: session.user?.email ?? null, authMethod: session.user?.authMethod ?? 'google' },
      }, 200);
    }

    const profileCacheKey = `user:profile:v1:${sessionUserId}`;
    const cachedProfile = await redisUtils.get<unknown>(profileCacheKey);
    if (cachedProfile !== null) {
      return respond(cachedProfile as Record<string, unknown>, 200, { headers: PROFILE_CACHE_HEADERS });
    }

    await connectDB();
    const { user } = await getCurrentUser(session);
    if (!user) return respond({ message: 'User not found. Please sign out and sign in again.' }, 404);
    if (user.banned) return respond({ message: 'Account suspended. Please contact support.', banned: true }, 403);

    if (!user.isRegistered || user.username?.startsWith('temp_')) {
      return respond({
        message: 'Profile incomplete. Please complete signup first.',
        needsCompletion: true,
        user: { name: user.name, email: user.email, authMethod: user.authMethod },
      }, 200);
    }

    const profileData = mapProfileResponse(user);
    await redisUtils.set(profileCacheKey, profileData, 60);
    return respond(profileData, 200, { headers: PROFILE_CACHE_HEADERS });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('User profile fetch error:', err);
    if (err.name === 'CastError') return badRequest('Invalid user ID format');
    if (err.name === 'MongoNetworkError') return respond({ success: false, error: 'Database connection error' }, 503);
    return respond({ message: 'Failed to fetch user profile', error: env.NODE_ENV === 'development' ? err.message : undefined }, 500);
  }
}

export async function handlePutProfile(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'update_profile', 20, 60 * 1000);
    if (!rateLimitResult.success) return tooManyRequests('Too many update attempts. Please try again later.');

    const auth = await requireSession();
    if ('error' in auth) return unauthorized();

    const guarded = guardSession(auth as AuthResult);
    if (guarded instanceof Response) return guarded;
    const { session } = guarded;

    if (session.user?.isRegistered === false || session.user?.needsOnboarding === true) {
      return respond({ message: 'Profile incomplete. Please complete signup first.', needsReauth: true, needsSignup: true }, 401);
    }

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, z.unknown());
    if ('error' in parsed) return parsed.error;
    const parsedBody = parseProfileUpdateBody(parsed.data);
    if (!parsedBody) return badRequest('Invalid request body');

    await connectDB();
    const { user } = await getCurrentUserDocument(session);
    if (!user) return notFound('User');
    if (user.banned) return forbidden('Account suspended');

    const preparedUpdates = await prepareProfileUpdates(parsedBody, user, toTrimmedString(session.user?.id) ?? '');
    if (preparedUpdates.error) return respond(preparedUpdates.error.body, preparedUpdates.error.status);

    const appliedUpdates = applyProfileUpdates(user, preparedUpdates.updates);
    if (appliedUpdates.error) return respond(appliedUpdates.error.body, appliedUpdates.error.status);

    await user.save();
    await invalidateAuthCache(String(user._id));
    await Promise.allSettled([
      redisUtils.del(`user:public-profile:${String(user._id)}`),
      redisUtils.del(`user:profile:v1:${String(user._id)}`),
    ]);

    return respond(mapUpdatedProfileResponse(user));
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Profile update error:', err);
    if (err.name === 'ValidationError') return respond({ message: 'Invalid data provided', details: err.message }, 400);
    if (err.name === 'CastError') return badRequest('Invalid data format');
    return respond({ message: 'Failed to update profile', error: env.NODE_ENV === 'development' ? err.message : undefined }, 500);
  }
}
