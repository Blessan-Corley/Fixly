import { Types } from 'mongoose';
import { NextResponse } from 'next/server';

import { Channels, Events, type SubscriptionActivatedPayload } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import {
  grantSubscriptionEntitlement,
} from '@/lib/services/billing/entitlementService';
import {
  markEventFailed,
  markEventProcessed,
  recordPaymentEvent,
} from '@/lib/services/billing/paymentEventService';
import type { PlanId } from '@/lib/services/billing/plans';
import User from '@/models/User';
import type { IUser } from '@/types/User';

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: {
    userId?: string;
    planId?: string;
    planType?: string;
    role?: string;
  };
  customer_id?: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: RazorpayPaymentEntity;
    };
  };
}

function getPlanPeriodEndIso(user: { plan?: IUser['plan'] } | null): string | undefined {
  const planEnd = user?.plan?.endDate ?? user?.plan?.expiresAt;
  if (!planEnd) return undefined;
  return new Date(planEnd).toISOString();
}

export async function handlePaymentCaptured(body: RazorpayWebhookPayload): Promise<NextResponse> {
  const payment = body.payload.payment.entity;
  const paymentId = payment.id;
  const orderId = payment.order_id;
  const metadataUserId = payment.notes?.userId?.trim();
  const planId = payment.notes?.planId;
  const planType = payment.notes?.planType ?? 'pro';

  if (!metadataUserId || !planId) {
    logger.warn({ paymentId, orderId }, 'Razorpay payment.captured missing userId or planId in notes');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  await connectDB();

  const { isNew } = await recordPaymentEvent(paymentId, 'payment.captured', metadataUserId, payment as unknown as object);
  if (!isNew) {
    logger.info({ paymentId, orderId, userId: metadataUserId }, 'Duplicate webhook event skipped');
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  try {
    await grantSubscriptionEntitlement(metadataUserId, {
      orderId,
      paymentId,
      planId: planId as PlanId,
      planType,
      razorpayCustomerId: payment.customer_id,
      amount: payment.amount / 100,
    });
    await markEventProcessed(paymentId);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown entitlement error';
    await markEventFailed(paymentId, message);
    throw error;
  }

  const refreshedUser = await User.findById(metadataUserId).select('email name plan').lean<{
    _id: Types.ObjectId;
    email?: string;
    name?: string;
    plan?: IUser['plan'];
  } | null>();

  await publishToChannel(Channels.user(metadataUserId), Events.user.subscriptionActivated, {
    planId: planId,
    periodEnd: getPlanPeriodEndIso(refreshedUser),
    activatedAt: new Date().toISOString(),
    subscriptionId: orderId,
  } satisfies SubscriptionActivatedPayload);

  if (refreshedUser?.email) {
    await inngest.send({
      name: 'razorpay/payment.captured',
      data: {
        orderId,
        paymentId,
        userId: metadataUserId,
        userEmail: refreshedUser.email,
        userName: refreshedUser.name ?? 'User',
        amount: payment.amount / 100,
        currency: payment.currency.toUpperCase(),
        planId,
        periodEnd: getPlanPeriodEndIso(refreshedUser),
      },
    });
  }

  logger.info({ paymentId, orderId, userId: metadataUserId }, 'Razorpay payment captured and subscription granted');
  return NextResponse.json({ received: true }, { status: 200 });
}
