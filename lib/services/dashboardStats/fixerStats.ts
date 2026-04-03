import { type Types } from 'mongoose';

import Job from '@/models/Job';
import User from '@/models/User';

import type { DashboardStats, FixerHistoryAggregateRow } from './types';
import { buildFixerMonthlyHistory } from './utils';

export async function getFixerStats(userId: Types.ObjectId | string): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfHistoryWindow = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [user, applicationStats, earningsStats, activeJobs, recentApplications] = await Promise.all([
    User.findById(userId).select('jobsCompleted rating plan totalEarnings').lean(),

    // Single $facet aggregation replaces 5 separate unwind+match+count pipelines
    Job.aggregate([
      { $match: { 'applications.fixer': userId } },
      { $unwind: '$applications' },
      { $match: { 'applications.fixer': userId } },
      {
        $facet: {
          total: [{ $count: 'value' }],
          pending: [
            { $match: { 'applications.status': 'pending' } },
            { $count: 'value' },
          ],
          accepted: [
            { $match: { 'applications.status': 'accepted' } },
            { $count: 'value' },
          ],
          rejected: [
            { $match: { 'applications.status': 'rejected' } },
            { $count: 'value' },
          ],
          thisMonth: [
            { $match: { 'applications.appliedAt': { $gte: startOfMonth } } },
            { $count: 'value' },
          ],
          successRate: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                accepted: {
                  $sum: { $cond: [{ $eq: ['$applications.status', 'accepted'] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ]),

    // Single $facet aggregation replaces 5 separate earnings pipelines
    Job.aggregate([
      { $match: { assignedTo: userId, status: 'completed' } },
      {
        $facet: {
          total: [{ $group: { _id: null, value: { $sum: '$budget.amount' } } }],
          monthly: [
            { $match: { 'progress.completedAt': { $gte: startOfMonth } } },
            { $group: { _id: null, value: { $sum: '$budget.amount' } } },
          ],
          yearly: [
            { $match: { 'progress.completedAt': { $gte: startOfYear } } },
            { $group: { _id: null, value: { $sum: '$budget.amount' } } },
          ],
          weekly: [
            { $match: { 'progress.completedAt': { $gte: startOfWeek } } },
            { $group: { _id: null, value: { $sum: '$budget.amount' } } },
          ],
          lastMonth: [
            {
              $match: {
                'progress.completedAt': { $gte: startOfLastMonth, $lte: endOfLastMonth },
              },
            },
            { $group: { _id: null, value: { $sum: '$budget.amount' } } },
          ],
          history: [
            { $match: { 'progress.completedAt': { $gte: startOfHistoryWindow } } },
            {
              $group: {
                _id: {
                  year: { $year: '$progress.completedAt' },
                  month: { $month: '$progress.completedAt' },
                },
                earnings: { $sum: '$budget.amount' },
                jobs: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
        },
      },
    ]),

    Job.countDocuments({ assignedTo: userId, status: 'in_progress' }),

    Job.find({ 'applications.fixer': userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title status budget location applications updatedAt')
      .lean(),
  ]);

  const appStats = applicationStats[0] ?? {};
  const earnStats = earningsStats[0] ?? {};

  const facetCount = (facet: Array<{ value?: number }> | undefined): number =>
    facet?.[0]?.value ?? 0;
  const facetTotal = (facet: Array<{ value?: number }> | undefined): number =>
    facet?.[0]?.value ?? 0;

  const successRateRow = (appStats.successRate as Array<{ total?: number; accepted?: number }>)?.[0];
  const successRateTotal = successRateRow?.total ?? 0;
  const successRateAccepted = successRateRow?.accepted ?? 0;

  const userPlan =
    user && typeof user.plan === 'object' && user.plan ? (user.plan as Record<string, unknown>) : {};

  return {
    totalApplications: facetCount(appStats.total as Array<{ value?: number }>),
    pendingApplications: facetCount(appStats.pending as Array<{ value?: number }>),
    acceptedApplications: facetCount(appStats.accepted as Array<{ value?: number }>),
    rejectedApplications: facetCount(appStats.rejected as Array<{ value?: number }>),
    applicationsThisMonth: facetCount(appStats.thisMonth as Array<{ value?: number }>),
    activeJobs,
    completedJobs: typeof user?.jobsCompleted === 'number' ? user.jobsCompleted : 0,
    jobsCompleted: typeof user?.jobsCompleted === 'number' ? user.jobsCompleted : 0,
    totalEarnings: facetTotal(earnStats.total as Array<{ value?: number }>),
    monthlyEarnings: facetTotal(earnStats.monthly as Array<{ value?: number }>),
    yearlyEarnings: facetTotal(earnStats.yearly as Array<{ value?: number }>),
    weeklyEarnings: facetTotal(earnStats.weekly as Array<{ value?: number }>),
    lastMonthEarnings: facetTotal(earnStats.lastMonth as Array<{ value?: number }>),
    rating: user?.rating ?? { average: 0, count: 0 },
    currentSubscriptionStatus: userPlan.status ?? 'active',
    planType: userPlan.type ?? 'free',
    recentApplications,
    earningsHistory: buildFixerMonthlyHistory(
      (earnStats.history ?? []) as FixerHistoryAggregateRow[],
      now
    ),
    successRate:
      successRateTotal > 0 ? Math.round((successRateAccepted / successRateTotal) * 100) : 0,
  };
}
