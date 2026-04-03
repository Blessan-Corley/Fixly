import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { logger } from '@/lib/logger';
import { markEventFailed, recordPaymentEvent } from '@/lib/services/billing/paymentEventService';
import { NotificationService } from '@/lib/services/notifications';

import {
  findUserByStripeCustomerId,
  resolveDisputeCustomerId,
  successResponse,
} from '../resolvers';

export async function handleChargeDisputeCreated(event: Stripe.Event): Promise<NextResponse> {
  logger.info({ eventId: event.id, eventType: event.type }, '[Stripe Webhook] Processing event');
  const dispute = event.data.object as Stripe.Dispute;
  const stripeCustomerId = await resolveDisputeCustomerId(dispute);
  const user = await findUserByStripeCustomerId(stripeCustomerId);

  if (user) {
    const { isNew } = await recordPaymentEvent(
      event.id,
      event.type,
      String(user._id),
      dispute as unknown as object
    );

    if (isNew) {
      await markEventFailed(event.id, 'Charge dispute created - manual review required');
      await NotificationService.notifyDisputeUpdate(
        dispute.id,
        String(user._id),
        'A payment dispute was opened and has been flagged for manual review.'
      );
    }
  }

  logger.warn(
    { eventId: event.id, disputeId: dispute.id, reason: dispute.reason, amount: dispute.amount },
    '[Stripe Webhook] Charge dispute created'
  );
  return successResponse();
}
