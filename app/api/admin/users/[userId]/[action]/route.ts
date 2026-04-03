// Phase 2: Updated admin user actions to validate CSRF against the authenticated session.
import { Types } from 'mongoose';

import { badRequest, forbidden, notFound, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateAdminMetricsCache } from '@/lib/services/adminMetricsService';
import Job from '@/models/Job';
import User from '@/models/User';
import type { IUser } from '@/types/User';
import { rateLimit } from '@/utils/rateLimiting';

type SessionUser = {
  id?: string;
  role?: string;
  name?: string;
};

type RouteParams = {
  userId?: string;
  action?: string;
};

type UserDocument = IUser & {
  _id: Types.ObjectId;
  save: () => Promise<unknown>;
};

type AdminAction = 'ban' | 'unban' | 'verify' | 'unverify' | 'view';

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function parseAction(value: string | undefined): AdminAction | null {
  const action = toTrimmedString(value)?.toLowerCase();
  if (action === 'ban') return 'ban';
  if (action === 'unban') return 'unban';
  if (action === 'verify') return 'verify';
  if (action === 'unverify') return 'unverify';
  if (action === 'view') return 'view';
  return null;
}

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

    const adminUser = auth.session.user as SessionUser & { id: string };
    const sessionUserId = adminUser?.id;
    if (!sessionUserId) {
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
      const userObjectId = new Types.ObjectId(userId);

      const [jobsPosted, jobsCompleted, earningsAggregate] = await Promise.all([
        user.role === 'hirer'
          ? Job.countDocuments({ createdBy: userObjectId })
          : Promise.resolve(0),
        user.role === 'fixer'
          ? Job.countDocuments({ assignedTo: userObjectId, status: 'completed' })
          : Promise.resolve(0),
        user.role === 'fixer'
          ? Job.aggregate([
              { $match: { assignedTo: userObjectId, status: 'completed' } },
              { $group: { _id: null, total: { $sum: '$budget.amount' } } },
            ])
          : Promise.resolve([]),
      ]);

      const totalEarnings =
        Array.isArray(earningsAggregate) && earningsAggregate.length > 0
          ? earningsAggregate[0]?.total || 0
          : 0;

      const userDetails = await User.findById(userId).select('-passwordHash').lean();

      return respond({
        success: true,
        user: {
          ...userDetails,
          stats: {
            jobsPosted: user.role === 'hirer' ? jobsPosted : undefined,
            jobsCompleted: user.role === 'fixer' ? jobsCompleted : undefined,
            totalEarnings: user.role === 'fixer' ? totalEarnings : undefined,
            memberSince: userDetails?.createdAt,
            lastActive: userDetails?.lastLoginAt || userDetails?.createdAt,
            notificationCount: Array.isArray(userDetails?.notifications)
              ? userDetails.notifications.length
              : 0,
          },
        },
      });
    }

    if (action === 'ban') {
      user.banned = true;
      user.banDetails = {
        reason: 'Banned by admin',
        description: 'Banned by admin',
        type: 'permanent',
        bannedAt: new Date(),
        bannedBy: adminUser.id,
        previousBans: Array.isArray(user.banDetails?.previousBans)
          ? user.banDetails.previousBans
          : [],
      };
    }

    if (action === 'unban') {
      user.banned = false;
      user.banDetails = undefined;
    }

    if (action === 'verify') {
      user.isVerified = true;
      if (user.verification) {
        user.verification.status = 'approved';
        user.verification.reviewedAt = new Date();
        user.verification.reviewedBy = adminUser.id;
      }
    }

    if (action === 'unverify') {
      user.isVerified = false;
      if (user.verification) {
        user.verification.status = 'rejected';
        user.verification.reviewedAt = new Date();
        user.verification.reviewedBy = adminUser.id;
      }
    }

    await user.save();
    await invalidateAuthCache(String(user._id));
    await invalidateAdminMetricsCache();

    logger.info(
      `Admin action: ${adminUser.name || 'admin'} (${adminUser.id}) ${action} user ${user.name} (${userId})`
    );

    const successMessage: Record<Exclude<AdminAction, 'view'>, string> = {
      ban: 'User banned successfully',
      unban: 'User unbanned successfully',
      verify: 'User verified successfully',
      unverify: 'User unverified successfully',
    };

    return respond({
      success: true,
      message: successMessage[action],
    });
  } catch (error: unknown) {
    const action = (await context?.params)?.action || 'action';
    logger.error(`Admin user ${action} error:`, error);
    return serverError('Failed to perform action');
  }
}
