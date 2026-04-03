import mongoose from 'mongoose';

import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import PaymentEvent from '@/models/PaymentEvent';
import User from '@/models/User';

type ActiveUserRecord = {
  _id: mongoose.Types.ObjectId;
  plan?: {
    type?: string;
    status?: string;
    activatedAt?: Date;
    startDate?: Date;
  };
};

async function run(): Promise<void> {
  await connectDB();

  const activeUsers = (await User.find({
    'plan.status': 'active',
  })
    .select('_id plan.type plan.status plan.activatedAt plan.startDate')
    .lean()) as ActiveUserRecord[];

  let reconciled = 0;
  let alreadyHadRecords = 0;

  for (const user of activeUsers) {
    const existingRecord = await PaymentEvent.findOne({
      userId: user._id,
      status: 'processed',
    }).lean();

    if (existingRecord) {
      alreadyHadRecords += 1;
      continue;
    }

    try {
      await PaymentEvent.create({
        stripeEventId: `manual_reconciliation_${String(user._id)}_${Date.now()}`,
        stripeEventType: 'manual_reconciliation',
        userId: user._id,
        status: 'processed',
        processedAt: user.plan?.activatedAt || user.plan?.startDate || new Date(),
        rawEvent: {
          source: 'reconciliation_script',
          planType: user.plan?.type || 'unknown',
        },
      });

      reconciled += 1;
      logger.info(
        { event: 'subscription_reconciled', userId: String(user._id), planType: user.plan?.type },
        'Subscription reconciled'
      );
    } catch (error: unknown) {
      const duplicateKey =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000;

      if (duplicateKey) {
        alreadyHadRecords += 1;
        logger.warn({ userId: String(user._id) }, 'Duplicate reconciliation event skipped');
        continue;
      }

      logger.error({ error, userId: String(user._id) }, 'Failed to reconcile subscription');
    }
  }

  logger.info(
    {
      event: 'subscription_reconciliation_summary',
      totalUsersFound: activeUsers.length,
      totalReconciled: reconciled,
      totalAlreadyHadRecords: alreadyHadRecords,
    },
    'Subscription reconciliation completed'
  );
}

run()
  .catch((error: unknown) => {
    logger.error({ error }, 'Subscription reconciliation failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
