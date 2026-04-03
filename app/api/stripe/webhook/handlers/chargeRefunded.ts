import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { revokeSubscriptionEntitlement } from '@/lib/services/billing/entitlementService';
import { markEventProcessed, recordPaymentEvent } from '@/lib/services/billing/paymentEventService';

import {
  findUserByStripeCustomerId,
  getStripeCustomerId,
  successResponse,
} from '../resolvers';

export async function handleChargeRefunded(event: Stripe.Event): Promise<NextResponse> {
  const charge = event.data.object as Stripe.Charge;
  const stripeCustomerId = getStripeCustomerId(charge.customer);
  const user = await findUserByStripeCustomerId(stripeCustomerId);

  if (user) {
    const { isNew } = await recordPaymentEvent(
      event.id,
      event.type,
      String(user._id),
      charge as unknown as object
    );

    if (isNew) {
      await revokeSubscriptionEntitlement(String(user._id), 'stripe_charge_refunded');
      await markEventProcessed(event.id);
    }
  }

  return successResponse();
}
