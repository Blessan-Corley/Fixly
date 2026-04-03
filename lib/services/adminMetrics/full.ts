import type { FilterQuery } from 'mongoose';

import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Dispute from '@/models/Dispute';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';

import type {
  AdminMetrics,
  CountResult,
  DisputeAverageAggregate,
  DisputedJobAggregate,
  UserPlanAggregate,
} from './types';
import {
  getServiceHealthScore,
  normalizeUserPlanRevenue,
  startOfMonth,
  startOfToday,
  startOfWeek,
  toAggregateCount,
  toAverage,
  toCount,
} from './utils';

const ADMIN_METRICS_KEY = 'admin:metrics:full';
const FIVE_MINUTES = 5 * 60;

export { ADMIN_METRICS_KEY };

export async function getAdminMetrics(forceRefresh = false): Promise<AdminMetrics> {
  await connectDB();

  if (!forceRefresh) {
    const cached = await redisUtils.get<AdminMetrics>(ADMIN_METRICS_KEY);
    if (cached) {
      return cached;
    }
  }

  const today = startOfToday();
  const week = startOfWeek();
  const month = startOfMonth();

  const userQueries = [
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: 'hirer' }),
    User.countDocuments({ role: 'fixer' }),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: week } }),
    User.countDocuments({ createdAt: { $gte: month } }),
    User.countDocuments({
      $or: [{ lastActivityAt: { $gte: today } }, { lastLoginAt: { $gte: today } }],
    }),
    User.countDocuments({ banned: true }),
  ] as const;

  const jobQueries = [
    Job.countDocuments({}),
    Job.countDocuments({ status: { $in: ['open', 'in_progress', 'in-progress'] } }),
    Job.countDocuments({ status: 'completed' }),
    Job.countDocuments({ status: 'cancelled' }),
    Dispute.aggregate<DisputedJobAggregate>([
      { $match: { isActive: true } },
      { $group: { _id: '$job' } },
      { $count: 'count' },
    ]),
    Job.countDocuments({ createdAt: { $gte: today } }),
    Job.countDocuments({ createdAt: { $gte: week } }),
  ] as const;

  const applicationQueries = [
    Job.aggregate<CountResult>([{ $unwind: '$applications' }, { $count: 'count' }]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'pending' } },
      { $count: 'count' },
    ]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'accepted' } },
      { $count: 'count' },
    ]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'rejected' } },
      { $count: 'count' },
    ]),
    Job.aggregate<CountResult>([
      { $unwind: '$applications' },
      {
        $match: {
          'applications.status': 'withdrawn',
          'applications.reviewedAt': { $gte: week },
        },
      },
      { $count: 'count' },
    ]),
  ] as const;

  const reviewQueries = [
    Review.countDocuments({}),
    Review.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, average: { $avg: '$rating.overall' } } },
    ]),
    Review.countDocuments({ reportedBy: { $exists: true, $not: { $size: 0 } } }),
  ] as const;

  const disputeQueries = [
    Dispute.countDocuments({}),
    Dispute.countDocuments({
      status: { $in: ['pending', 'under_review', 'awaiting_response', 'in_mediation'] },
      isActive: true,
    }),
    Dispute.countDocuments({ status: 'resolved' }),
    Dispute.countDocuments({ status: 'escalated' }),
    Dispute.aggregate<DisputeAverageAggregate>([
      {
        $match: {
          status: 'resolved',
          createdAt: { $exists: true },
          'resolution.implementedAt': { $exists: true },
        },
      },
      {
        $project: {
          resolutionMs: { $subtract: ['$resolution.implementedAt', '$createdAt'] },
        },
      },
      { $group: { _id: null, avgMs: { $avg: '$resolutionMs' } } },
    ]),
  ] as const;

  const revenueQuery = User.aggregate<UserPlanAggregate>([
    { $match: { 'plan.status': 'active' } satisfies FilterQuery<unknown> },
    {
      $group: {
        _id: { role: '$role', type: '$plan.type' },
        count: { $sum: 1 },
        totalAmount: { $sum: { $ifNull: ['$plan.amount', 0] } },
      },
    },
  ]);

  const [userResults, jobResults, applicationResults, reviewResults, disputeResults, revenueResult, healthScore] =
    await Promise.all([
      Promise.allSettled(userQueries),
      Promise.allSettled(jobQueries),
      Promise.allSettled(applicationQueries),
      Promise.allSettled(reviewQueries),
      Promise.allSettled(disputeQueries),
      revenueQuery.catch((error: unknown) => {
        logger.warn({ error }, 'Admin revenue metrics query failed');
        return [] as UserPlanAggregate[];
      }),
      getServiceHealthScore().catch((error: unknown) => {
        logger.warn({ error }, 'Admin health score query failed');
        return 0;
      }),
    ]);

  const avgResolutionMs =
    disputeResults[4].status === 'fulfilled' ? (disputeResults[4].value[0]?.avgMs ?? 0) : 0;
  if (disputeResults[4].status === 'rejected') {
    logger.warn({ error: disputeResults[4].reason }, 'Admin dispute resolution average failed');
  }

  const revenue = normalizeUserPlanRevenue(revenueResult);
  const metrics: AdminMetrics = {
    users: {
      total: toCount(userResults[0], 'users.total'),
      hirers: toCount(userResults[1], 'users.hirers'),
      fixers: toCount(userResults[2], 'users.fixers'),
      newToday: toCount(userResults[3], 'users.newToday'),
      newThisWeek: toCount(userResults[4], 'users.newThisWeek'),
      newThisMonth: toCount(userResults[5], 'users.newThisMonth'),
      activeToday: toCount(userResults[6], 'users.activeToday'),
      banned: toCount(userResults[7], 'users.banned'),
    },
    jobs: {
      total: toCount(jobResults[0], 'jobs.total'),
      active: toCount(jobResults[1], 'jobs.active'),
      completed: toCount(jobResults[2], 'jobs.completed'),
      cancelled: toCount(jobResults[3], 'jobs.cancelled'),
      disputed: toAggregateCount(jobResults[4], 'jobs.disputed'),
      postedToday: toCount(jobResults[5], 'jobs.postedToday'),
      postedThisWeek: toCount(jobResults[6], 'jobs.postedThisWeek'),
    },
    applications: {
      total: toAggregateCount(applicationResults[0], 'applications.total'),
      pending: toAggregateCount(applicationResults[1], 'applications.pending'),
      accepted: toAggregateCount(applicationResults[2], 'applications.accepted'),
      rejected: toAggregateCount(applicationResults[3], 'applications.rejected'),
      withdrawnThisWeek: toAggregateCount(applicationResults[4], 'applications.withdrawnThisWeek'),
    },
    reviews: {
      total: toCount(reviewResults[0], 'reviews.total'),
      averageRating: toAverage(reviewResults[1], 'reviews.averageRating'),
      flagged: toCount(reviewResults[2], 'reviews.flagged'),
    },
    disputes: {
      total: toCount(disputeResults[0], 'disputes.total'),
      open: toCount(disputeResults[1], 'disputes.open'),
      resolved: toCount(disputeResults[2], 'disputes.resolved'),
      escalated: toCount(disputeResults[3], 'disputes.escalated'),
      avgResolutionDays: avgResolutionMs
        ? Number((avgResolutionMs / (1000 * 60 * 60 * 24)).toFixed(2))
        : 0,
    },
    revenue: {
      totalEstimated: revenue.totalEstimated,
      subscriptionsActive: revenue.subscriptionsActive,
      fixerProCount: revenue.fixerProCount,
      fixerBasicCount: revenue.fixerBasicCount,
      hirerProCount: revenue.hirerProCount,
      hirerBasicCount: revenue.hirerBasicCount,
    },
    platform: {
      healthScore,
      lastUpdated: new Date().toISOString(),
    },
  };

  await redisUtils.set(ADMIN_METRICS_KEY, metrics, FIVE_MINUTES);
  return metrics;
}
