/**
 * Cache Invalidation Utilities
 * Helper functions to invalidate Redis cache when data changes.
 * Admin/stats operations: see cacheInvalidation.admin.ts
 */

import { redisUtils } from '../lib/redis';

export { getCacheStatistics, clearAllCaches } from './cacheInvalidation.admin';

export async function invalidateDashboardStats(userId: string, userRole: string): Promise<boolean> {
  try {
    await redisUtils.del(`dashboard:stats:${userRole}:${userId}`);
    return true;
  } catch (error) {
    console.error('Dashboard stats cache invalidation failed:', error);
    return false;
  }
}

export async function invalidateUserProfile(username: string): Promise<boolean> {
  try {
    await redisUtils.del(`user:profile:${username}`);
    return true;
  } catch (error) {
    console.error('User profile cache invalidation failed:', error);
    return false;
  }
}

export async function invalidateJobDetails(jobId: string): Promise<boolean> {
  try {
    await redisUtils.del(`job:details:${jobId}`);
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

export default {
  invalidateDashboardStats,
  invalidateUserProfile,
  invalidateJobDetails,
  invalidateUserCaches,
  invalidateJobCaches,
  bulkInvalidate,
};
