import Job from '@/models/Job';
import User from '@/models/User';

import type { DashboardStats } from './types';

export async function getAdminStats(): Promise<DashboardStats> {
  const lastSevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeUsers, totalJobs, activeJobs, completedJobs] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({
      $or: [{ lastActivityAt: { $gte: lastSevenDays } }, { lastLoginAt: { $gte: lastSevenDays } }],
    }),
    Job.countDocuments({}),
    Job.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    Job.countDocuments({ status: 'completed' }),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalJobs,
    activeJobs,
    completedJobs,
    revenue: 0,
  };
}
