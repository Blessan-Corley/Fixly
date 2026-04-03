/**
 * Cache Invalidation Utilities
 * Helper functions to invalidate Redis cache when data changes
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

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

export async function invalidateDashboardStats(userId: string, userRole: string): Promise<boolean> {
  try {
    const cacheKey = `dashboard:stats:${userRole}:${userId}`;
    await redisUtils.del(cacheKey);
    return true;
  } catch (error) {
    console.error('Dashboard stats cache invalidation failed:', error);
    return false;
  }
}

export async function invalidateUserProfile(username: string): Promise<boolean> {
  try {
    const cacheKey = `user:profile:${username}`;
    await redisUtils.del(cacheKey);
    return true;
  } catch (error) {
    console.error('User profile cache invalidation failed:', error);
    return false;
  }
}

export async function invalidateJobDetails(jobId: string): Promise<boolean> {
  try {
    const cacheKey = `job:details:${jobId}`;
    await redisUtils.del(cacheKey);
    return true;
  } catch (error) {
    console.error('Job details cache invalidation failed:', error);
    return false;
  }
}

export async function invalidateUserCaches(
  userId: string,
  username: string,
  userRole: string
): Promise<boolean> {
  try {
    const results = await Promise.all([
      invalidateDashboardStats(userId, userRole),
      invalidateUserProfile(username),
    ]);
    return results.every(Boolean);
  } catch (error) {
    console.error('User caches invalidation failed:', error);
    return false;
  }
}

export async function invalidateJobCaches(
  jobId: string,
  hirerUserId: string,
  fixerUserId: string | null = null
): Promise<boolean> {
  try {
    const tasks: Promise<boolean>[] = [invalidateJobDetails(jobId)];

    if (hirerUserId) {
      tasks.push(invalidateDashboardStats(hirerUserId, 'hirer'));
    }

    if (fixerUserId) {
      tasks.push(invalidateDashboardStats(fixerUserId, 'fixer'));
    }

    const results = await Promise.all(tasks);
    return results.every(Boolean);
  } catch (error) {
    console.error('Job caches invalidation failed:', error);
    return false;
  }
}

export async function bulkInvalidate(cacheKeys: string[]): Promise<boolean> {
  try {
    await Promise.all(cacheKeys.map((key) => redisUtils.del(key)));
    return true;
  } catch (error) {
    console.error('Bulk cache invalidation failed:', error);
    return false;
  }
}

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

export default {
  invalidateDashboardStats,
  invalidateUserProfile,
  invalidateJobDetails,
  invalidateUserCaches,
  invalidateJobCaches,
  bulkInvalidate,
  getCacheStatistics,
  clearAllCaches,
};
