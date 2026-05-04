import { respond, serverError, tooManyRequests } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  escapeRegex,
  parsePositiveInt,
  parseSort,
  SORT_MAP,
  toTrimmedString,
  type UserListQuery,
} from '../admin-users.helpers';

const ADMIN_USERS_TTL = 60;

export async function GET(request: Request): Promise<Response> {
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
    if (cached != null) return respond(cached);

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
