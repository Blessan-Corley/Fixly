/**
 * Cache Invalidation Utilities
 * Helper functions to invalidate Redis cache when data changes
 */

import { redisUtils } from '../lib/redis.js';

/**
 * Invalidate dashboard stats cache for a specific user
 * Call this when user completes actions that affect their stats
 */
export async function invalidateDashboardStats(userId, userRole) {
  try {
    const cacheKey = `dashboard:stats:${userRole}:${userId}`;
    await redisUtils.del(cacheKey);
    console.log('✅ Dashboard stats cache invalidated:', cacheKey);
    return true;
  } catch (error) {
    console.error('❌ Dashboard stats cache invalidation failed:', error);
    return false;
  }
}

/**
 * Invalidate user profile cache
 * Call this when user profile data changes
 */
export async function invalidateUserProfile(username) {
  try {
    const cacheKey = `user:profile:${username}`;
    await redisUtils.del(cacheKey);
    console.log('✅ User profile cache invalidated:', username);
    return true;
  } catch (error) {
    console.error('❌ User profile cache invalidation failed:', error);
    return false;
  }
}

/**
 * Invalidate job details cache
 * Call this when job data changes
 */
export async function invalidateJobDetails(jobId) {
  try {
    const cacheKey = `job:details:${jobId}`;
    await redisUtils.del(cacheKey);
    console.log('✅ Job details cache invalidated:', jobId);
    return true;
  } catch (error) {
    console.error('❌ Job details cache invalidation failed:', error);
    return false;
  }
}

/**
 * Invalidate all caches for a user
 * Call this when user performs major actions (job post, application, etc.)
 */
export async function invalidateUserCaches(userId, username, userRole) {
  try {
    await Promise.all([
      invalidateDashboardStats(userId, userRole),
      invalidateUserProfile(username)
    ]);
    console.log('✅ All user caches invalidated:', username);
    return true;
  } catch (error) {
    console.error('❌ User caches invalidation failed:', error);
    return false;
  }
}

/**
 * Invalidate caches related to a job action
 * Call this when job status changes, applications submitted, etc.
 */
export async function invalidateJobCaches(jobId, hirerUserId, fixerUserId = null) {
  try {
    const promises = [invalidateJobDetails(jobId)];

    // Invalidate hirer's stats
    if (hirerUserId) {
      promises.push(invalidateDashboardStats(hirerUserId, 'hirer'));
    }

    // Invalidate fixer's stats if assigned
    if (fixerUserId) {
      promises.push(invalidateDashboardStats(fixerUserId, 'fixer'));
    }

    await Promise.all(promises);
    console.log('✅ Job-related caches invalidated:', jobId);
    return true;
  } catch (error) {
    console.error('❌ Job caches invalidation failed:', error);
    return false;
  }
}

/**
 * Bulk invalidate multiple cache keys
 */
export async function bulkInvalidate(cacheKeys) {
  try {
    await Promise.all(cacheKeys.map(key => redisUtils.del(key)));
    console.log('✅ Bulk cache invalidation completed:', cacheKeys.length, 'keys');
    return true;
  } catch (error) {
    console.error('❌ Bulk cache invalidation failed:', error);
    return false;
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStatistics() {
  try {
    // Get all cache keys
    const allKeys = await redisUtils.keys('*');

    const stats = {
      total: allKeys.length,
      byType: {
        dashboard: allKeys.filter(k => k.startsWith('dashboard:')).length,
        userProfile: allKeys.filter(k => k.startsWith('user:profile:')).length,
        jobDetails: allKeys.filter(k => k.startsWith('job:details:')).length,
        other: 0
      }
    };

    stats.byType.other = stats.total - (stats.byType.dashboard + stats.byType.userProfile + stats.byType.jobDetails);

    return stats;
  } catch (error) {
    console.error('❌ Failed to get cache statistics:', error);
    return null;
  }
}

/**
 * Clear all application caches (use with caution!)
 * Only for maintenance or debugging
 */
export async function clearAllCaches() {
  try {
    const keys = await redisUtils.keys('dashboard:*');
    const profileKeys = await redisUtils.keys('user:profile:*');
    const jobKeys = await redisUtils.keys('job:details:*');

    const allKeys = [...keys, ...profileKeys, ...jobKeys];

    if (allKeys.length > 0) {
      await Promise.all(allKeys.map(key => redisUtils.del(key)));
    }

    console.log('✅ All application caches cleared:', allKeys.length, 'keys');
    return { cleared: allKeys.length };
  } catch (error) {
    console.error('❌ Clear all caches failed:', error);
    return { cleared: 0, error: error.message };
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
  clearAllCaches
};
