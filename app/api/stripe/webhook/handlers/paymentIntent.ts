import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { logger } from '@/lib/logger';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/services/notifications';

import { getPaymentIntentInvoiceId, successResponse } from '../resolvers';

export async function handlePaymentIntentSucceeded(event: Stripe.Event): Promise<NextResponse> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  if (getPaymentIntentInvoiceId(paymentIntent)) {
    logger.info(
      { eventId: event.id, paymentIntentId: paymentIntent.id },
      'Ignoring subscription payment_intent.succeeded to prevent duplicate fulfillment'
    );
    return successResponse({ received: true, ignored: true });
  }

  logger.info(
    { eventId: event.id, paymentIntentId: paymentIntent.id, amount: paymentIntent.amount },
    'Ignoring payment_intent.succeeded because checkout.session.completed is canonical'
  );
  return successResponse({ received: true, ignored: true });
}

export async function handlePaymentIntentFailed(event: Stripe.Event): Promise<NextResponse> {
  logger.info({ eventId: event.id, eventType: event.type }, '[Stripe Webhook] Processing event');
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const userId = paymentIntent.metadata?.userId?.trim();

  logger.warn(
    {
      eventId: event.id,
      paymentIntentId: paymentIntent.id,
      userId,
      reason: paymentIntent.last_payment_error?.message,
    },
    'Stripe payment_intent.payment_failed received'
  );

  if (userId) {
    await NotificationService.createNotification(
      userId,
      NOTIFICATION_TYPES.PAYMENT_FAILED,
      'Payment Failed',
      'Your recent subscription payment failed. Please try again.',
      '/dashboard/subscription',
      {
        paymentIntentId: paymentIntent.id,
        reason: paymentIntent.last_payment_error?.message,
      }
    );
  }

  return successResponse();
}
