import {
  badRequest,
  notFound,
  ok,
  parseBody,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { UpdateSettingsSchema } from '@/lib/validations/user';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asBooleanOrUndefined,
  asTrimmedString,
  AUTH_CONTEXT_COOKIE_NAME,
  DeleteAccountSchema,
  isRecord,
  NEXTAUTH_COOKIE_PREFIX,
  PrivacyBodySchema,
  toValidationErrors,
  type PrivacyInput,
} from './privacy.helpers';

export async function PUT(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'privacy_update', 10, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, UpdateSettingsSchema.and(PrivacyBodySchema));
    if ('error' in parsed) return parsed.error;

    if (!isRecord(parsed.data.privacy)) {
      return badRequest('Privacy settings are required');
    }

    const privacy = parsed.data.privacy as PrivacyInput;
    const validationErrors = toValidationErrors(privacy);
    if (validationErrors.length > 0) {
      return badRequest('Validation errors', validationErrors);
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    const privacyUpdate: Record<string, unknown> = {};
    if (privacy.profileVisibility !== undefined) {
      privacyUpdate.profileVisibility = privacy.profileVisibility;
    }

    const showPhone = asBooleanOrUndefined(privacy.showPhone);
    const showEmail = asBooleanOrUndefined(privacy.showEmail);
    const showLocation = asBooleanOrUndefined(privacy.showLocation);
    const showRating = asBooleanOrUndefined(privacy.showRating);
    const allowReviews = asBooleanOrUndefined(privacy.allowReviews);
    const allowMessages = asBooleanOrUndefined(privacy.allowMessages);
    const dataSharingConsent = asBooleanOrUndefined(privacy.dataSharingConsent);

    if (showPhone !== undefined) privacyUpdate.showPhone = showPhone;
    if (showEmail !== undefined) privacyUpdate.showEmail = showEmail;
    if (showLocation !== undefined) privacyUpdate.showLocation = showLocation;
    if (showRating !== undefined) privacyUpdate.showRating = showRating;
    if (allowReviews !== undefined) privacyUpdate.allowReviews = allowReviews;
    if (allowMessages !== undefined) privacyUpdate.allowMessages = allowMessages;
    if (dataSharingConsent !== undefined) privacyUpdate.dataSharingConsent = dataSharingConsent;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { privacy: { ...user.privacy, ...privacyUpdate } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return notFound('User');

    await updatedUser.addNotification(
      'privacy_updated',
      'Privacy Settings Updated',
      'Your privacy settings have been successfully updated.'
    );

    return ok({
      message: 'Privacy settings updated successfully',
      user: { id: updatedUser._id, privacy: updatedUser.privacy },
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Privacy settings update error:', err);
    return serverError('Failed to update privacy settings');
  }
}

export async function GET() {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    const privacySettings = {
      profileVisibility: user.privacy?.profileVisibility || 'public',
      showPhone: user.privacy?.showPhone ?? true,
      showEmail: user.privacy?.showEmail ?? false,
      showLocation: user.privacy?.showLocation ?? true,
      showRating: user.privacy?.showRating ?? true,
      allowReviews: user.privacy?.allowReviews ?? true,
      allowMessages: user.privacy?.allowMessages ?? true,
      dataSharingConsent: user.privacy?.dataSharingConsent ?? false,
    };

    return ok({ privacy: privacySettings });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Get privacy settings error:', err);
    return serverError('Failed to get privacy settings');
  }
}

export async function DELETE(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'account_delete', 3, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, DeleteAccountSchema);
    if ('error' in parsed) return parsed.error;

    const confirmDelete = asTrimmedString(parsed.data.confirmDelete);
    if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
      return badRequest('Account deletion must be confirmed with "DELETE_MY_ACCOUNT"');
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    await User.findByIdAndUpdate(
      userId,
      {
        deletedAt: new Date(),
        isActive: false,
        email: `deleted_${Date.now()}@deleted.local`,
        phone: null,
        name: 'Deleted User',
      },
      { new: true }
    );

    await invalidateAuthCache(userId);

    const response = respond({
      success: true,
      message: 'Account has been scheduled for deletion. You have 30 days to reactivate if needed.',
      shouldSignOut: true,
    });

    response.cookies.set(`${NEXTAUTH_COOKIE_PREFIX}next-auth.session-token`, '', {
      expires: new Date(0),
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    });
    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    response.cookies.set(AUTH_CONTEXT_COOKIE_NAME, '', {
      expires: new Date(0),
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    });

    return response;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Account deletion error:', err);
    return serverError('Failed to delete account');
  }
}
