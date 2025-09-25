/**
 * User-Triggered Cleanup for Vercel Deployment
 * Since cron jobs don't work on Vercel Hobby, we trigger cleanup during user actions
 */

import connectDB from '../db';
import User from '../../models/User';
import Job from '../../models/Job';

// Track last cleanup times in Redis
import { redisUtils } from '../redis';

const CLEANUP_INTERVALS = {
  OTP_CLEANUP: 60 * 60 * 1000, // 1 hour
  NOTIFICATION_CLEANUP: 24 * 60 * 60 * 1000, // 24 hours
  BAN_CLEANUP: 6 * 60 * 60 * 1000, // 6 hours
};

/**
 * Trigger cleanup during user actions (login, job post, etc.)
 */
export async function triggerUserBasedCleanup(actionType = 'general') {
  try {
    await connectDB();

    // Check if enough time has passed since last cleanup
    const lastCleanup = await redisUtils.get(`cleanup:${actionType}:last`);
    const now = Date.now();

    if (lastCleanup && (now - parseInt(lastCleanup)) < CLEANUP_INTERVALS.NOTIFICATION_CLEANUP) {
      return; // Skip if cleaned recently
    }

    console.log(`🧹 Triggering user-based cleanup for: ${actionType}`);

    // 1. Clean expired OTPs
    await cleanExpiredOTPs();

    // 2. Process expired bans
    await processExpiredBans();

    // 3. Clean old notifications (only if it's been 24 hours)
    if (!lastCleanup || (now - parseInt(lastCleanup)) >= CLEANUP_INTERVALS.NOTIFICATION_CLEANUP) {
      await cleanOldNotifications();
    }

    // Update last cleanup time
    await redisUtils.set(`cleanup:${actionType}:last`, now.toString(), { ex: 86400 }); // 24 hours

    console.log(`✅ User-based cleanup completed for: ${actionType}`);

  } catch (error) {
    console.error('❌ User-based cleanup error:', error);
  }
}

/**
 * Clean expired OTPs (triggered on every auth action)
 */
async function cleanExpiredOTPs() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await User.updateMany(
      {
        'verification.otp.expiresAt': { $lt: oneHourAgo }
      },
      {
        $unset: {
          'verification.otp': 1
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned ${result.modifiedCount} expired OTPs`);
    }
  } catch (error) {
    console.error('Failed to clean expired OTPs:', error);
  }
}

/**
 * Process expired temporary bans
 */
async function processExpiredBans() {
  try {
    const now = new Date();

    const expiredBans = await User.find({
      'status.banned': true,
      'banDetails.type': 'temporary',
      'banDetails.expiresAt': { $lt: now }
    });

    for (const user of expiredBans) {
      user.status.banned = false;
      user.status.banReason = null;
      user.banDetails = undefined;
      await user.save();
    }

    if (expiredBans.length > 0) {
      console.log(`🧹 Processed ${expiredBans.length} expired bans`);
    }
  } catch (error) {
    console.error('Failed to process expired bans:', error);
  }
}

/**
 * Clean old read notifications (once per day)
 */
async function cleanOldNotifications() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await User.updateMany(
      {},
      {
        $pull: {
          notifications: {
            read: true,
            createdAt: { $lt: thirtyDaysAgo }
          }
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned old notifications from ${result.modifiedCount} users`);
    }
  } catch (error) {
    console.error('Failed to clean old notifications:', error);
  }
}

/**
 * Middleware to add cleanup triggers to API routes
 */
export function withCleanup(handler, cleanupType = 'general') {
  return async (req, res) => {
    // Trigger cleanup asynchronously (don't wait for it)
    triggerUserBasedCleanup(cleanupType).catch(console.error);

    // Continue with the original handler
    return handler(req, res);
  };
}

/**
 * Get cleanup stats for admin dashboard
 */
export async function getCleanupStats() {
  try {
    const stats = {};

    // Get last cleanup times
    const cleanupTypes = ['general', 'auth', 'jobs', 'notifications'];
    for (const type of cleanupTypes) {
      const lastCleanup = await redisUtils.get(`cleanup:${type}:last`);
      stats[type] = lastCleanup ? new Date(parseInt(lastCleanup)) : null;
    }

    // Get counts that need cleanup
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const expiredOTPs = await User.countDocuments({
      'verification.otp.expiresAt': { $lt: oneHourAgo }
    });

    const expiredBans = await User.countDocuments({
      'status.banned': true,
      'banDetails.type': 'temporary',
      'banDetails.expiresAt': { $lt: new Date() }
    });

    stats.pending = {
      expiredOTPs,
      expiredBans
    };

    return stats;
  } catch (error) {
    console.error('Failed to get cleanup stats:', error);
    return {};
  }
}