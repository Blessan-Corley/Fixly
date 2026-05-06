/**
 * Admin-level cache utilities: statistics and bulk clearing.
 */

import { redisUtils } from '../lib/redis';

type CacheStatistics = {
  total: number;
  byType: {
    dashboard: number;
    userProfile: number;
    jobDetails: number;
    other: number;
  };
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

export async function getCacheStatistics(): Promise<CacheStatistics | null> {
  try {
    const allKeys = (await redisUtils.keys('*')) as string[];

    const stats: CacheStatistics = {
      total: allKeys.length,
      byType: {
        dashboard: allKeys.filter((key) => key.startsWith('dashboard:')).length,
        userProfile: allKeys.filter((key) => key.startsWith('user:profile:')).length,
        jobDetails: allKeys.filter((key) => key.startsWith('job:details:')).length,
        other: 0,
      },
    };

    stats.byType.other =
      stats.total - (stats.byType.dashboard + stats.byType.userProfile + stats.byType.jobDetails);

    return stats;
  } catch (error) {
    console.error('Failed to get cache statistics:', error);
    return null;
  }
}

export async function clearAllCaches(): Promise<{ cleared: number; error?: string }> {
  try {
    const keys = (await redisUtils.keys('dashboard:*')) as string[];
    const profileKeys = (await redisUtils.keys('user:profile:*')) as string[];
    const jobKeys = (await redisUtils.keys('job:details:*')) as string[];

    const allKeys = [...keys, ...profileKeys, ...jobKeys];

    if (allKeys.length > 0) {
      await Promise.all(allKeys.map((key) => redisUtils.del(key)));
    }

    return { cleared: allKeys.length };
  } catch (error) {
    return { cleared: 0, error: getErrorMessage(error) };
  }
}
