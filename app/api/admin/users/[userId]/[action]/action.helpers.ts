import { Types } from 'mongoose';

import { respond } from '@/lib/api';
import Job from '@/models/Job';
import User from '@/models/User';
import type { IUser } from '@/types/User';

export type SessionUser = {
  id: string;
  role?: string;
  name?: string;
};

export type RouteParams = {
  userId?: string;
  action?: string;
};

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  save: () => Promise<unknown>;
};

export type AdminAction = 'ban' | 'unban' | 'verify' | 'unverify' | 'view';

export const ACTION_SUCCESS_MESSAGES: Record<Exclude<AdminAction, 'view'>, string> = {
  ban: 'User banned successfully',
  unban: 'User unbanned successfully',
  verify: 'User verified successfully',
  unverify: 'User unverified successfully',
};

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parseAction(value: string | undefined): AdminAction | null {
  const action = toTrimmedString(value)?.toLowerCase();
  if (action === 'ban') return 'ban';
  if (action === 'unban') return 'unban';
  if (action === 'verify') return 'verify';
  if (action === 'unverify') return 'unverify';
  if (action === 'view') return 'view';
  return null;
}

export async function handleViewAction(
  userId: string,
  user: UserDocument,
  adminUserId: string
): Promise<Response> {
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

  void adminUserId; // available for audit logging if needed

  return respond({
    success: true,
    user: {
      ...userDetails,
      stats: {
        jobsPosted: user.role === 'hirer' ? jobsPosted : undefined,
        jobsCompleted: user.role === 'fixer' ? jobsCompleted : undefined,
        totalEarnings: user.role === 'fixer' ? totalEarnings : undefined,
        memberSince: userDetails?.createdAt,
        lastActive: (userDetails as Record<string, unknown>)?.lastLoginAt || userDetails?.createdAt,
        notificationCount: Array.isArray(userDetails?.notifications)
          ? userDetails.notifications.length
          : 0,
      },
    },
  });
}

export function applyUserAction(
  action: Exclude<AdminAction, 'view'>,
  user: UserDocument,
  adminUser: SessionUser
): void {
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
}
