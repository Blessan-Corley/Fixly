import Stripe from 'stripe';

import { AppError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import {
  getEntitlementStatus as getComputedEntitlementStatus,
  isSubscriptionActive,
} from '@/lib/services/billing/subscriptionStatus';
import User from '@/models/User';
import type { IUser } from '@/types/User';

import { getPlanById, type PlanId } from './plans';

export type EntitlementResult =
  | { allowed: true }
  | { allowed: false; reason: string; upgradeRequired?: boolean; nextAllowedAt?: Date };

async function invalidateBillingCache(userId: string, role: string | undefined): Promise<void> {
  const cacheKeys = [`dashboard:stats:${userId}`];

  if (role === 'hirer' || role === 'fixer') {
    cacheKeys.push(`subscription:${role}:${userId}`);
  }

  await redisUtils.del(...cacheKeys);
}

function toStripeId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

function toStripeSubscriptionId(
  value: string | Stripe.Subscription | null
): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
    return value.id;
  }

  return null;
}

export async function grantSubscriptionEntitlement(
  userId: string,
  stripeSession: Stripe.Checkout.Session
): Promise<void> {
  const planId = stripeSession.metadata?.planId as PlanId | undefined;
  const planType = stripeSession.metadata?.planType ?? 'pro';
  const stripeCustomerId = toStripeId(stripeSession.customer);
  const stripeSubscriptionId = toStripeSubscriptionId(stripeSession.subscription);

  if (!planId) {
    throw new AppError('VALIDATION_ERROR', 'Stripe session missing plan metadata', 400);
  }

  const plan = getPlanById(planId);
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found for entitlement grant', 404);
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const paymentId =
    typeof stripeSession.payment_intent === 'string' ? stripeSession.payment_intent : undefined;

  await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        'plan.type': planType,
        'plan.status': 'active',
        'plan.startDate': startDate,
        'plan.endDate': endDate,
        'plan.expiresAt': endDate,
        'plan.billingCycle': plan.billingCycle,
        'plan.amount': plan.amountRs,
        'plan.features': plan.features,
        'plan.stripeCustomerId': stripeCustomerId ?? undefined,
        'plan.stripeSubscriptionId': stripeSubscriptionId,
        'plan.activatedAt': startDate,
        'plan.subscribedAt': startDate,
        'plan.paymentId': paymentId,
        'plan.creditsUsed': 0,
        pendingOrder: null,
      },
    },
    { new: true }
  );
  await invalidateBillingCache(userId, user.role);

  logger.info({
    event: 'entitlement_granted',
    userId,
    planType,
    planId,
    stripeCustomerId,
    stripeSubscriptionId,
  });
}

export async function revokeSubscriptionEntitlement(
  userId: string,
  reason: string
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found for entitlement revocation', 404);
  }

  const nextStatus = isSubscriptionActive(user) ? 'cancelled' : 'expired';

  await User.findByIdAndUpdate(userId, {
    $set: {
      'plan.status': nextStatus,
      'plan.cancelledAt': new Date(),
    },
  });
  await invalidateBillingCache(userId, user.role);

  logger.info({ event: 'entitlement_revoked', userId, reason, status: nextStatus });
}

export async function getEntitlementStatus(userId: string): Promise<{
  isActive: boolean;
  planType: string;
  expiresAt: Date | null;
  features: string[];
}> {
  const user = (await User.findById(userId).lean()) as IUser | null;
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  return getComputedEntitlementStatus(user);
}
