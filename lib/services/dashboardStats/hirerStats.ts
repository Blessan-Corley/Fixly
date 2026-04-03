import { type Types } from 'mongoose';

import Job from '@/models/Job';

import type { DashboardStats } from './types';
import { aggregateNumber } from './utils';

export async function getHirerStats(userId: Types.ObjectId | string): Promise<DashboardStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [jobCountStats, applicationStats, totalSpent, avgCompletionTime, recentJobs] =
    await Promise.all([
      // Single $facet aggregation replaces 6 separate countDocuments calls
      Job.aggregate([
        { $match: { createdBy: userId } },
        {
          $facet: {
            total: [{ $count: 'value' }],
            active: [
              { $match: { status: { $in: ['open', 'in_progress'] } } },
              { $count: 'value' },
            ],
            completed: [{ $match: { status: 'completed' } }, { $count: 'value' }],
            cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'value' }],
            thisMonth: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $count: 'value' },
            ],
            today: [
              { $match: { createdAt: { $gte: startOfToday } } },
              { $count: 'value' },
            ],
          },
        },
      ]),

      // Application stats: total and pending count in one pass
      Job.aggregate([
        { $match: { createdBy: userId } },
        {
          $facet: {
            total: [
              { $project: { applicationCount: { $size: '$applications' } } },
              { $group: { _id: null, total: { $sum: '$applicationCount' } } },
            ],
            pending: [
              { $unwind: '$applications' },
              { $match: { 'applications.status': 'pending' } },
              { $count: 'pending' },
            ],
          },
        },
      ]),

      Job.aggregate([
        {
          $match: {
            createdBy: userId,
            status: 'completed',
            'budget.type': { $ne: 'negotiable' },
          },
        },
        { $group: { _id: null, total: { $sum: '$budget.amount' } } },
      ]),

      Job.aggregate([
        {
          $match: {
            createdBy: userId,
            status: 'completed',
            'progress.startedAt': { $exists: true },
            'progress.completedAt': { $exists: true },
          },
        },
        {
          $project: {
            completionTime: {
              $divide: [
                { $subtract: ['$progress.completedAt', '$progress.startedAt'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        { $group: { _id: null, avgDays: { $avg: '$completionTime' } } },
      ]),

      Job.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status createdAt budget location')
        .lean(),
    ]);

  const facetCount = (facet: Array<{ value?: number }> | undefined): number =>
    facet?.[0]?.value ?? 0;

  const counts = jobCountStats[0] ?? {};
  const appStats = applicationStats[0] ?? {};

  const totalJobs = facetCount(counts.total as Array<{ value?: number }>);
  const completedJobs = facetCount(counts.completed as Array<{ value?: number }>);
  const totalApplicationsCount = (appStats.total as Array<{ total?: number }>)?.[0]?.total ?? 0;
  const pendingApplicationsCount = aggregateNumber(appStats.pending as Array<Record<string, unknown>>, 'pending');

  return {
    totalJobs,
    activeJobs: facetCount(counts.active as Array<{ value?: number }>),
    completedJobs,
    cancelledJobs: facetCount(counts.cancelled as Array<{ value?: number }>),
    jobsThisMonth: facetCount(counts.thisMonth as Array<{ value?: number }>),
    jobsToday: facetCount(counts.today as Array<{ value?: number }>),
    totalApplications: totalApplicationsCount,
    pendingApplications: pendingApplicationsCount,
    totalApplicants: totalApplicationsCount,
    totalSpent: aggregateNumber(totalSpent, 'total'),
    averageJobRating: 0,
    avgCompletionTime: Math.round(aggregateNumber(avgCompletionTime, 'avgDays')),
    recentJobs,
    completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
    responseRate:
      totalApplicationsCount > 0
        ? Math.round(
            ((totalApplicationsCount - pendingApplicationsCount) / totalApplicationsCount) * 100
          )
        : 0,
  };
}
