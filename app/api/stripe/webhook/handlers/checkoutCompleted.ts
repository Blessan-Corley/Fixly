import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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
import { stripe } from '@/lib/stripe';
import User from '@/models/User';
import type { IUser } from '@/types/User';

import {
  findUserForCheckoutSession,
  getCustomerEmail,
  getPlanPeriodEndIso,
  getStripeCustomerId,
  getSubscriptionId,
  successResponse,
} from '../resolvers';

export async function handleCheckoutCompleted(event: Stripe.Event): Promise<NextResponse> {
  const checkoutSessionObject = event.data.object as Stripe.Checkout.Session;
  const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionObject.id, {
    expand: ['subscription', 'customer'],
  });
  const user = await findUserForCheckoutSession(checkoutSession);

  if (!user) {
    logger.warn(
      {
        eventId: event.id,
        sessionId: checkoutSession.id,
        stripeCustomerId: getStripeCustomerId(checkoutSession.customer),
        customerEmail: getCustomerEmail(checkoutSession),
      },
      'Checkout session user could not be resolved'
    );
    return successResponse();
  }

  const userId = String(user._id);
  await connectDB();

  const { isNew } = await recordPaymentEvent(event.id, event.type, userId, checkoutSession);
  if (!isNew) {
    logger.info(
      { eventId: event.id, sessionId: checkoutSession.id, userId },
      'Duplicate webhook event skipped'
    );
    return successResponse({ received: true, duplicate: true });
  }

  try {
    await grantSubscriptionEntitlement(userId, checkoutSession);
    await markEventProcessed(event.id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown entitlement error';
    await markEventFailed(event.id, message);
    throw error;
  }

  const refreshedUser = await User.findById(userId).select('email name plan').lean<{
    _id: Types.ObjectId;
    email?: string;
    name?: string;
    plan?: IUser['plan'];
  } | null>();

  await publishToChannel(Channels.user(userId), Events.user.subscriptionActivated, {
    planId: checkoutSession.metadata?.planId?.trim() || 'pro',
    periodEnd: getPlanPeriodEndIso(refreshedUser),
    activatedAt: new Date().toISOString(),
    subscriptionId: getSubscriptionId(checkoutSession.subscription),
  } satisfies SubscriptionActivatedPayload);

  if (refreshedUser?.email) {
    await inngest.send({
      name: 'stripe/checkout.completed',
      data: {
        orderId: checkoutSession.id,
        userId,
        userEmail: refreshedUser.email,
        userName: refreshedUser.name ?? 'User',
        amount: Number(checkoutSession.amount_total || 0) / 100,
        currency: (checkoutSession.currency || 'usd').toUpperCase(),
        planId: checkoutSession.metadata?.planId?.trim() || 'pro',
        periodEnd: getPlanPeriodEndIso(refreshedUser),
      },
    });
  }

  logger.info(
    { eventId: event.id, sessionId: checkoutSession.id, userId },
    'Stripe checkout session processed successfully'
  );
  return successResponse();
}
