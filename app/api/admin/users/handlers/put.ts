import { Types } from 'mongoose';

import { badRequest, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateAdminMetricsCache } from '@/lib/services/adminMetricsService';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  AdminUsersActionSchema,
  toTrimmedString,
  type SessionUser,
  type UserAction,
} from '../admin-users.helpers';

export async function PUT(request: Request): Promise<Response> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const rateLimitResult = await rateLimit(request, 'admin_user_action', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const session = auth.session as { user?: SessionUser };
    if (!session.user?.id) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedActionBody = await parseBody(request, AdminUsersActionSchema);
    if ('error' in parsedActionBody) return parsedActionBody.error;

    const action = parsedActionBody.data.action as UserAction;
    const reason = toTrimmedString(parsedActionBody.data.reason) || undefined;
    const rawIds = parsedActionBody.data.userIds
      ? parsedActionBody.data.userIds
      : parsedActionBody.data.userId
        ? [parsedActionBody.data.userId]
        : null;

    if (!rawIds) return badRequest('Action and user IDs are required');

    const userIds = rawIds
      .map((id) => toTrimmedString(id))
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .filter((id) => Types.ObjectId.isValid(id));

    if (userIds.length === 0 || userIds.length !== rawIds.length) {
      return badRequest('Invalid user IDs provided');
    }

    await connectDB();

    const adminId = session.user.id as string;
    const targetUsers = await User.find({
      _id: { $in: userIds },
      role: { $ne: 'admin' },
    }).select('_id');

    if (targetUsers.length !== userIds.length) {
      return badRequest('Cannot perform action on admin accounts or invalid user IDs');
    }

    let updateQuery: Record<string, unknown> = {};
    let successMessage = '';

    if (action === 'ban') {
      updateQuery = {
        banned: true,
        banDetails: {
          reason: reason || 'Banned by admin',
          description: reason || 'Banned by admin',
          type: 'permanent',
          bannedAt: new Date(),
          bannedBy: adminId,
        },
      };
      successMessage = 'Users banned successfully';
    }

    if (action === 'unban') {
      updateQuery = { banned: false, $unset: { banDetails: 1 } };
      successMessage = 'Users unbanned successfully';
    }

    if (action === 'verify') {
      updateQuery = { isVerified: true };
      successMessage = 'Users verified successfully';
    }

    if (action === 'unverify') {
      updateQuery = { isVerified: false };
      successMessage = 'Users unverified successfully';
    }

    if (action === 'delete') {
      updateQuery = {
        banned: true,
        isActive: false,
        deletedAt: new Date(),
        banDetails: {
          reason: reason || 'Account deleted by admin',
          description: reason || 'Account deleted by admin',
          type: 'permanent',
          bannedAt: new Date(),
          bannedBy: adminId,
        },
      };
      successMessage = 'Users deleted successfully';
    }

    const result = await User.updateMany(
      { _id: { $in: userIds }, role: { $ne: 'admin' } },
      updateQuery
    );

    await Promise.allSettled(userIds.map((id) => invalidateAuthCache(id)));
    await Promise.allSettled([
      invalidateAdminMetricsCache(),
      redisUtils.invalidatePattern('admin:users:v1:*'),
    ]);

    return respond({
      success: true,
      message: successMessage,
      affectedUsers: result.modifiedCount,
      matchedUsers: result.matchedCount,
    });
  } catch (error: unknown) {
    logger.error('Admin user action error:', error);
    return serverError('Failed to perform action');
  }
}
