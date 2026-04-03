import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { logger } from '@/lib/logger';
import { markEventFailed, recordPaymentEvent } from '@/lib/services/billing/paymentEventService';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/services/notifications';

import {
  findUserByStripeCustomerId,
  getStripeCustomerId,
  successResponse,
} from '../resolvers';

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<NextResponse> {
  logger.info({ eventId: event.id, eventType: event.type }, '[Stripe Webhook] Processing event');
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = getStripeCustomerId(invoice.customer);
  const user = await findUserByStripeCustomerId(stripeCustomerId);

  if (user) {
    const { isNew } = await recordPaymentEvent(
      event.id,
      event.type,
      String(user._id),
      invoice as unknown as object
    );

    if (isNew) {
      await markEventFailed(event.id, 'Invoice payment failed - manual review required');
      await NotificationService.createNotification(
        String(user._id),
        NOTIFICATION_TYPES.PAYMENT_FAILED,
        'Subscription Payment Failed',
        'Your recurring payment failed. Please update your payment method.',
        '/dashboard/subscription',
        {
          invoiceId: invoice.id,
          status: invoice.status ?? 'payment_failed',
        }
      );
    }
  }

  return successResponse();
}
