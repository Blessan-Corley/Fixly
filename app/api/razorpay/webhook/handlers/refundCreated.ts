import { NextResponse } from 'next/server';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { revokeSubscriptionEntitlement } from '@/lib/services/billing/entitlementService';
import {
  findPaymentEventByPaymentId,
  recordPaymentEvent,
} from '@/lib/services/billing/paymentEventService';

interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    refund: {
      entity: RazorpayRefundEntity;
    };
  };
}

export async function handleRefundCreated(body: RazorpayWebhookPayload): Promise<NextResponse> {
  const refund = body.payload.refund.entity;
  const refundId = refund.id;
  const paymentId = refund.payment_id;

  logger.info(
    { refundId, paymentId, amount: refund.amount / 100, currency: refund.currency },
    'Razorpay refund.created received'
  );

  await connectDB();

  // Look up the original payment event to resolve the userId
  const originalEvent = await findPaymentEventByPaymentId(paymentId);
  const userId = originalEvent?.userId ? String(originalEvent.userId).trim() : '';

  const { isNew } = await recordPaymentEvent(
    refundId,
    'refund.created',
    userId,
    refund as unknown as object
  );

  if (!isNew) {
    logger.info({ refundId, paymentId }, 'Duplicate refund webhook skipped');
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  if (!userId) {
    logger.warn(
      { refundId, paymentId },
      'Refund received but original payment event has no userId — skipping entitlement revocation'
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    await revokeSubscriptionEntitlement(userId, 'refund');

    await publishToChannel(Channels.user(userId), Events.user.paymentFailed, {
      reason: 'refund_issued',
      refundId,
      paymentId,
      amountRs: refund.amount / 100,
      currency: refund.currency.toUpperCase(),
      revokedAt: new Date().toISOString(),
    });

    logger.info({ refundId, paymentId, userId }, 'Subscription revoked after refund');
  } catch (error: unknown) {
    logger.error(
      { error, refundId, paymentId, userId },
      'Failed to revoke entitlement after refund — manual review required'
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
