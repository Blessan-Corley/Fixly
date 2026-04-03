import { Types } from 'mongoose';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import connectDB from '@/lib/mongodb';
import { stripe } from '@/lib/stripe';
import User from '@/models/User';
import type { IUser } from '@/types/User';

export type StripeUserDocument = IUser & {
  _id: Types.ObjectId;
};

export function getStripeCustomerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

export async function findUserByStripeCustomerId(
  stripeCustomerId: string | null
): Promise<StripeUserDocument | null> {
  if (!stripeCustomerId) {
    return null;
  }

  await connectDB();
  return (await User.findOne({
    'plan.stripeCustomerId': stripeCustomerId,
  })) as StripeUserDocument | null;
}

export async function findUserByEmail(email: string | null): Promise<StripeUserDocument | null> {
  if (!email) {
    return null;
  }

  await connectDB();
  return (await User.findOne({ email })) as StripeUserDocument | null;
}

export function getCustomerEmail(checkoutSession: Stripe.Checkout.Session): string | null {
  if (checkoutSession.customer_details?.email) {
    return checkoutSession.customer_details.email;
  }

  const customer = checkoutSession.customer;
  if (
    customer &&
    typeof customer === 'object' &&
    'email' in customer &&
    typeof customer.email === 'string'
  ) {
    return customer.email;
  }

  return null;
}

export async function findUserForCheckoutSession(
  checkoutSession: Stripe.Checkout.Session
): Promise<StripeUserDocument | null> {
  const metadataUserId = checkoutSession.metadata?.userId?.trim();
  if (metadataUserId) {
    await connectDB();
    const userById = (await User.findById(metadataUserId)) as StripeUserDocument | null;
    if (userById) {
      return userById;
    }
  }

  const stripeCustomerId = getStripeCustomerId(checkoutSession.customer);
  const userByCustomerId = await findUserByStripeCustomerId(stripeCustomerId);
  if (userByCustomerId) {
    return userByCustomerId;
  }

  return findUserByEmail(getCustomerEmail(checkoutSession));
}

export function getPlanPeriodEndIso(user: { plan?: IUser['plan'] } | null): string | undefined {
  const planEnd = user?.plan?.endDate ?? user?.plan?.expiresAt;
  if (!planEnd) {
    return undefined;
  }

  return new Date(planEnd).toISOString();
}

export function getSubscriptionId(value: string | Stripe.Subscription | null): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

export function getPaymentIntentInvoiceId(paymentIntent: Stripe.PaymentIntent): string | null {
  if ('invoice' in paymentIntent) {
    const invoice = paymentIntent.invoice;
    if (typeof invoice === 'string' && invoice.trim().length > 0) {
      return invoice;
    }
  }

  return null;
}

export function successResponse(body: Record<string, unknown> = { received: true }): NextResponse {
  return NextResponse.json(body, { status: 200 });
}

export async function resolveDisputeCustomerId(dispute: Stripe.Dispute): Promise<string | null> {
  if (typeof dispute.charge === 'string' && dispute.charge.trim().length > 0) {
    const charge = await stripe.charges.retrieve(dispute.charge);
    return getStripeCustomerId(charge.customer);
  }

  if (typeof dispute.payment_intent === 'string' && dispute.payment_intent.trim().length > 0) {
    const paymentIntent = await stripe.paymentIntents.retrieve(dispute.payment_intent);
    return getStripeCustomerId(paymentIntent.customer);
  }

  return null;
}
