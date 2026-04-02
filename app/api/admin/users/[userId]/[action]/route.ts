import { Types } from 'mongoose';

import {
  badRequest,
  forbidden,
  notFound,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateAdminMetricsCache } from '@/lib/services/adminMetricsService';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  ACTION_SUCCESS_MESSAGES,
  applyUserAction,
  handleViewAction,
  parseAction,
  toTrimmedString,
  type RouteParams,
  type SessionUser,
  type UserDocument,
} from './action.helpers';

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const rateLimitResult = await rateLimit(request, 'admin_user_action', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const adminUser = auth.session.user as SessionUser;
    if (!adminUser?.id) {
      return unauthorized();
    }

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const userId = toTrimmedString((await context.params)?.userId);
    const action = parseAction((await context.params)?.action);

    if (!userId || !Types.ObjectId.isValid(userId) || !action) {
      return badRequest('Valid user ID and action are required');
    }

    await connectDB();

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user) {
      return notFound('User');
    }

    if (user.role === 'admin') {
      return forbidden('Cannot perform actions on admin users');
    }

    if (action === 'view') {
      return handleViewAction(userId, user, adminUser.id);
    }

    applyUserAction(action, user, adminUser);

    await user.save();
    await invalidateAuthCache(String(user._id));
    await invalidateAdminMetricsCache();

    logger.info(
      `Admin action: ${adminUser.name || 'admin'} (${adminUser.id}) ${action} user ${user.name} (${userId})`
    );

    return respond({ success: true, message: ACTION_SUCCESS_MESSAGES[action] });
  } catch (error: unknown) {
    const action = (await context?.params)?.action || 'action';
    logger.error(`Admin user ${action} error:`, error);
    return serverError('Failed to perform action');
  }
}
