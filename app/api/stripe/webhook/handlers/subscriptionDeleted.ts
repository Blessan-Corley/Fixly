import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { revokeSubscriptionEntitlement } from '@/lib/services/billing/entitlementService';
import User from '@/models/User';

import {
  findUserByStripeCustomerId,
  getStripeCustomerId,
  successResponse,
  type StripeUserDocument,
} from '../resolvers';

export async function handleSubscriptionDeleted(event: Stripe.Event): Promise<NextResponse> {
  logger.info({ eventId: event.id, eventType: event.type }, '[Stripe Webhook] Processing event');
  const subscription = event.data.object as Stripe.Subscription;
  await connectDB();

  const metadataUserId = subscription.metadata?.userId?.trim();
  const stripeCustomerId = getStripeCustomerId(subscription.customer);

  const user = metadataUserId
    ? ((await User.findById(metadataUserId)) as StripeUserDocument | null)
    : await findUserByStripeCustomerId(stripeCustomerId);

  if (!user) {
    logger.warn(
      {
        eventId: event.id,
        subscriptionId: subscription.id,
        metadataUserId,
        stripeCustomerId,
      },
      'Stripe subscription deletion user not found'
    );
    return successResponse();
  }

  await revokeSubscriptionEntitlement(String(user._id), 'stripe_subscription_cancelled');
  logger.info(
    { eventId: event.id, subscriptionId: subscription.id, userId: String(user._id) },
    'Stripe subscription cancellation processed'
  );
  return successResponse();
}
