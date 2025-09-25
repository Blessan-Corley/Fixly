// app/api/cron/cleanup/route.js
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import Job from '../../../../models/Job';
import Conversation from '../../../../models/Conversation';

export const dynamic = 'force-dynamic';

// Daily cleanup tasks
export async function GET(request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Running daily cleanup tasks...');

    await connectDB();

    const cleanupResults = {
      expiredOtps: 0,
      expiredBans: 0,
      oldNotifications: 0,
      inactiveConversations: 0
    };

    // 1. Clean up expired OTPs (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const otpCleanup = await User.updateMany(
      {
        'verification.otp.expiresAt': { $lt: oneHourAgo }
      },
      {
        $unset: {
          'verification.otp': 1
        }
      }
    );
    cleanupResults.expiredOtps = otpCleanup.modifiedCount;

    // 2. Process expired temporary bans
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
    cleanupResults.expiredBans = expiredBans.length;

    // 3. Archive old read notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const notificationCleanup = await User.updateMany(
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
    cleanupResults.oldNotifications = notificationCleanup.modifiedCount;

    // 4. Mark conversations as inactive if no messages in 30 days
    const inactiveConversations = await Conversation.updateMany(
      {
        lastMessage: { $exists: true },
        'lastMessage.timestamp': { $lt: thirtyDaysAgo },
        status: { $ne: 'archived' }
      },
      {
        $set: {
          status: 'inactive',
          archivedAt: new Date()
        }
      }
    );
    cleanupResults.inactiveConversations = inactiveConversations.modifiedCount;

    // 5. Clean up soft-deleted jobs (older than 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const deletedJobsCleanup = await Job.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: ninetyDaysAgo }
    });

    console.log('Cleanup completed:', cleanupResults);

    return NextResponse.json({
      success: true,
      message: 'Daily cleanup completed successfully',
      results: cleanupResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Daily cleanup error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}