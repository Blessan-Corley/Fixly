import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';

/**
 * Expires the review window for completed jobs where one or both parties
 * have not submitted a rating within 14 days of job completion.
 *
 * Runs daily at 03:00 UTC.
 */
export const expireReviews = inngest.createFunction(
  { id: 'expire-reviews', name: 'Expire review windows after 14 days' },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    await step.run('expire-stale-review-windows', async () => {
      await connectDB();

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const result = await Job.updateMany(
        {
          status: 'completed',
          'completion.reviewStatus': { $in: ['pending', 'partial'] },
          'progress.completedAt': { $lte: fourteenDaysAgo },
        },
        {
          $set: {
            'completion.reviewStatus': 'expired',
            'completion.messagingClosed': true,
            'completion.messagingClosedAt': new Date(),
          },
        }
      );

      logger.info(
        { expired: result.modifiedCount },
        '[Inngest] Expired stale review windows'
      );

      return { expired: result.modifiedCount };
    });
  }
);
