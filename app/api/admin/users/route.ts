// Phase 2: Updated admin user mutations to validate CSRF against the authenticated session.
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
  escapeRegex,
  parsePositiveInt,
  parseSort,
  SORT_MAP,
  toTrimmedString,
  type SessionUser,
  type UserAction,
  type UserListQuery,
} from './admin-users.helpers';

export const dynamic = 'force-dynamic';

const ADMIN_USERS_TTL = 60;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const rateLimitResult = await rateLimit(request, 'admin_users', 50, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 20), 50);
    const search = toTrimmedString(searchParams.get('search')) ?? '';
    const role = toTrimmedString(searchParams.get('role')) ?? '';
    const status = toTrimmedString(searchParams.get('status')) ?? '';
    const sortBy = parseSort(searchParams.get('sortBy'));

    const query: UserListQuery = {};

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { username: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (role === 'hirer' || role === 'fixer' || role === 'admin') query.role = role;
    if (status === 'banned') query.banned = true;
    if (status === 'active') query.banned = false;
    if (status === 'verified') query.isVerified = true;
    if (status === 'unverified') query.isVerified = false;

    const sort = SORT_MAP[sortBy];
    const skip = (page - 1) * limit;
    const cacheKey = `admin:users:v1:${page}:${limit}:${search}:${role}:${status}:${sortBy}`;

    const cached = await redisUtils.get<Record<string, unknown>>(cacheKey);
    if (cached != null) {
      return respond(cached);
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select(
          '-passwordHash -notifications -googleId -firebaseUid -resetPasswordToken -resetPasswordExpires -verificationToken -twoFactorSecret'
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const enhancedUsers = users.map((user) => ({
      ...user,
      jobsCount: user.role === 'hirer' ? user.jobsPosted : user.jobsCompleted,
      memberSince: user.createdAt,
      lastActive: user.lastLoginAt || user.createdAt,
      isPro: user.plan?.type === 'pro' && user.plan?.status === 'active',
    }));

    const responsePayload = {
      users: enhancedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total,
      },
      filters: { search, role, status, sortBy },
    };
    await redisUtils.set(cacheKey, responsePayload, ADMIN_USERS_TTL);
    return respond(responsePayload);
  } catch (error: unknown) {
    logger.error('Admin users error:', error);
    return serverError('Failed to fetch users');
  }
}

export async function PUT(request: Request) {
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
