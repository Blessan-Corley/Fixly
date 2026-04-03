import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripe';
import {
  clearWebhookProcessed,
  isWebhookProcessed,
  markWebhookProcessed,
} from '@/lib/stripe/webhookIdempotency';

import { handleChargeDisputeCreated } from './handlers/chargeDispute';
import { handleChargeRefunded } from './handlers/chargeRefunded';
import { handleCheckoutCompleted } from './handlers/checkoutCompleted';
import { handleInvoicePaymentFailed } from './handlers/invoicePaymentFailed';
import {
  handlePaymentIntentFailed,
  handlePaymentIntentSucceeded,
} from './handlers/paymentIntent';
import { handleSubscriptionDeleted } from './handlers/subscriptionDeleted';
import { successResponse } from './resolvers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error: unknown) {
    logger.warn(
      { error: error instanceof Error ? error.message : 'Unknown signature error' },
      'Stripe webhook signature verification failed'
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (await isWebhookProcessed(event.id)) {
      logger.info({ eventId: event.id, eventType: event.type }, 'Stripe webhook replay ignored');
      return successResponse({ received: true, duplicate: true });
    }

    await markWebhookProcessed(event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        return await handleCheckoutCompleted(event);

      case 'payment_intent.succeeded':
        return await handlePaymentIntentSucceeded(event);

      case 'payment_intent.payment_failed':
        return await handlePaymentIntentFailed(event);

      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(event);

      case 'charge.dispute.created':
        return await handleChargeDisputeCreated(event);

      case 'charge.refunded':
        return await handleChargeRefunded(event);

      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(event);

      default:
        logger.debug(
          { eventId: event.id, eventType: event.type },
          'Unhandled Stripe webhook event'
        );
        return successResponse({ received: true, processed: false });
    }
  } catch (error: unknown) {
    await clearWebhookProcessed(event.id);
    logger.error(
      { error, eventId: event.id, eventType: event.type },
      'Unexpected Stripe webhook failure'
    );
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
