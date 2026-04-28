import { Types } from 'mongoose';
import { NextResponse } from 'next/server';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { markEventFailed, recordPaymentEvent } from '@/lib/services/billing/paymentEventService';
import User from '@/models/User';

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  error_code?: string;
  error_description?: string;
  notes?: {
    userId?: string;
    planId?: string;
  };
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: RazorpayPaymentEntity;
    };
  };
}

export async function handlePaymentFailed(body: RazorpayWebhookPayload): Promise<NextResponse> {
  const payment = body.payload.payment.entity;
  const paymentId = payment.id;
  const orderId = payment.order_id;
  const metadataUserId = payment.notes?.userId?.trim();
  const errorReason = payment.error_description ?? payment.error_code ?? 'Payment failed';

  logger.warn(
    { paymentId, orderId, userId: metadataUserId, errorCode: payment.error_code, errorDesc: payment.error_description },
    'Razorpay payment.failed received'
  );

  if (!metadataUserId) {
    logger.warn({ paymentId, orderId }, 'payment.failed webhook missing userId in notes');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  await connectDB();

  const { isNew } = await recordPaymentEvent(
    paymentId,
    'payment.failed',
    metadataUserId,
    payment as unknown as object
  );

  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  await markEventFailed(paymentId, errorReason);

  // Notify user in real-time via Ably
  await publishToChannel(Channels.user(metadataUserId), Events.user.paymentFailed, {
    paymentId,
    orderId,
    errorCode: payment.error_code,
    errorDescription: errorReason,
    amountRs: payment.amount / 100,
    currency: payment.currency.toUpperCase(),
    failedAt: new Date().toISOString(),
  });

  // Look up user for Inngest email notification
  const user = await User.findById(metadataUserId)
    .select('email name')
    .lean<{ _id: Types.ObjectId; email?: string; name?: string } | null>();

  if (user?.email) {
    await inngest.send({
      name: 'razorpay/payment.failed',
      data: {
        userId: metadataUserId,
        userEmail: user.email,
        userName: user.name ?? 'User',
        amountRs: payment.amount / 100,
        currency: payment.currency.toUpperCase(),
        reason: errorReason,
        paymentId,
        orderId,
      },
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
