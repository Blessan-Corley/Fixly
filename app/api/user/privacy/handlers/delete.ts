import {
  notFound,
  badRequest,
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
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  asTrimmedString,
  AUTH_CONTEXT_COOKIE_NAME,
  DeleteAccountSchema,
  NEXTAUTH_COOKIE_PREFIX,
} from '../privacy.helpers';

export async function DELETE(request: Request): Promise<Response> {
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

    const isProduction = env.NODE_ENV === 'production';
    const expired = new Date(0);
    const cookieBase = { expires: expired, httpOnly: true, path: '/', sameSite: 'lax' as const };

    response.cookies.set(`${NEXTAUTH_COOKIE_PREFIX}next-auth.session-token`, '', {
      ...cookieBase,
      secure: isProduction,
    });
    response.cookies.set('next-auth.session-token', '', {
      ...cookieBase,
      secure: false,
    });
    response.cookies.set(AUTH_CONTEXT_COOKIE_NAME, '', {
      ...cookieBase,
      secure: isProduction,
    });

    return response;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Account deletion error:', err);
    return serverError('Failed to delete account');
  }
}
