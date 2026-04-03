import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import Job from '@/models/Job';
import User from '@/models/User';

import { ADMIN_METRICS_KEY } from './adminMetrics/full';
import type { GroupedDateResult, TimeRange, TimeRangeMetrics } from './adminMetrics/types';
import { rangeToDays, toGroupedSeries } from './adminMetrics/utils';

export type { AdminMetrics, TimeRangeMetrics, TimeRange } from './adminMetrics/types';
export { getAdminMetrics } from './adminMetrics/full';

const ADMIN_TIMESERIES_KEY = 'admin:metrics:timeseries';
const TEN_MINUTES = 10 * 60;

export async function getAdminMetricsByTimeRange(timeRange: TimeRange): Promise<TimeRangeMetrics> {
  await connectDB();

  const cacheKey = `${ADMIN_TIMESERIES_KEY}:${timeRange}`;
  const cached = await redisUtils.get<TimeRangeMetrics>(cacheKey);
  if (cached) {
    return cached;
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - rangeToDays(timeRange));

  const [userSignups, jobsPosted, applications] = await Promise.allSettled([
    User.aggregate<GroupedDateResult>([
      { $match: { createdAt: { $gte: startDate }, role: { $ne: 'admin' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Job.aggregate<GroupedDateResult>([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Job.aggregate<GroupedDateResult>([
      { $unwind: '$applications' },
      { $match: { 'applications.appliedAt': { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$applications.appliedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const payload: TimeRangeMetrics = {
    range: timeRange,
    userSignups: toGroupedSeries(userSignups, 'timeseries.userSignups'),
    jobsPosted: toGroupedSeries(jobsPosted, 'timeseries.jobsPosted'),
    applications: toGroupedSeries(applications, 'timeseries.applications'),
  };

  await redisUtils.set(cacheKey, payload, TEN_MINUTES);
  return payload;
}

export async function invalidateAdminMetricsCache(): Promise<void> {
  await Promise.allSettled([
    redisUtils.del(ADMIN_METRICS_KEY),
    redisUtils.invalidatePattern(`${ADMIN_TIMESERIES_KEY}:*`),
  ]);
}
