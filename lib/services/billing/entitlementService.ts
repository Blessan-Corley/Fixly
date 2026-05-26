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

export interface RazorpayPaymentData {
  orderId: string;
  paymentId: string;
  planId: PlanId;
  planType?: string;
  razorpayCustomerId?: string;
  amount?: number;
}

async function invalidateBillingCache(userId: string, role: string | undefined): Promise<void> {
  const cacheKeys = [`dashboard:stats:${userId}`];

  if (role === 'hirer' || role === 'fixer') {
    cacheKeys.push(`subscription:${role}:${userId}`);
  }

  await redisUtils.del(...cacheKeys);
}

export async function grantSubscriptionEntitlement(
  userId: string,
  paymentData: RazorpayPaymentData
): Promise<void> {
  const { planId, planType = 'pro', razorpayCustomerId, paymentId } = paymentData;

  const plan = getPlanById(planId);
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found for entitlement grant', 404);
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

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
        'plan.razorpayCustomerId': razorpayCustomerId ?? undefined,
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
    razorpayCustomerId,
    paymentId,
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
