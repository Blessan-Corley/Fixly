import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { withServiceFallback } from '@/lib/resilience/serviceGuard';

import { getAdminStats } from './dashboardStats/adminStats';
import { getFixerStats } from './dashboardStats/fixerStats';
import { getHirerStats } from './dashboardStats/hirerStats';
import type { DashboardStats } from './dashboardStats/types';
import {
  buildDashboardStatsCacheKey,
  DASHBOARD_STATS_CACHE_TTL_SECONDS,
  parseCachedStats,
  toObjectId,
} from './dashboardStats/utils';

export async function getDashboardStats(userId: string, role: string): Promise<DashboardStats> {
  const cacheKey = buildDashboardStatsCacheKey(userId);
  const cachedStats = parseCachedStats(
    await withServiceFallback(() => redisUtils.get(cacheKey), null, 'dashboard-stats-cache-get')
  );
  if (cachedStats) return cachedStats;

  await connectDB();
  const dbUserId = toObjectId(userId);

  let stats: DashboardStats;
  if (role === 'hirer') {
    stats = await getHirerStats(dbUserId);
  } else if (role === 'fixer') {
    stats = await getFixerStats(dbUserId);
  } else if (role === 'admin') {
    stats = await getAdminStats();
  } else {
    logger.warn({ userId, role }, 'Unknown role for dashboard stats');
    stats = {};
  }

  await withServiceFallback(
    () => redisUtils.set(cacheKey, stats, DASHBOARD_STATS_CACHE_TTL_SECONDS),
    false,
    'dashboard-stats-cache-set'
  );
  return stats;
}

export async function invalidateDashboardStatsCache(userId: string): Promise<void> {
  if (!userId) return;

  await withServiceFallback(
    () => redisUtils.del(buildDashboardStatsCacheKey(userId)),
    false,
    'dashboard-stats-cache-delete'
  );
}
