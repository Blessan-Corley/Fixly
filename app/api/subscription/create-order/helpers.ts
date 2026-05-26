import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { razorpay } from '@/lib/razorpay';
import { getRedis, redisUtils } from '@/lib/redis';
import type { BillingPlanDefinition, BillingRole } from '@/lib/services/billing/plans';

/** TTL for the per-user order-creation lock (seconds). Prevents concurrent orders. */
const ORDER_LOCK_TTL_SECONDS = 30;

/**
 * Acquire a Redis NX lock. Returns true if acquired (or if Redis is unavailable).
 * Returns false if another request already holds it.
 */
export async function acquireOrderLock(userId: string): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) return true; // degraded: allow through
    const result = await redis.set(`order_lock:${userId}`, '1', 'EX', ORDER_LOCK_TTL_SECONDS, 'NX');
    return result === 'OK';
  } catch {
    return true; // degraded: allow through
  }
}

export async function releaseOrderLock(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    if (redis) await redis.del(`order_lock:${userId}`);
  } catch {
    // Best-effort — lock will expire via TTL
  }
}

export function invalidateSubscriptionCache(userId: string, role: BillingRole): Promise<boolean[]> {
  return Promise.all([
    redisUtils.del(`subscription:${role}:${userId}`),
    redisUtils.del(`dashboard:stats:${userId}`),
  ]);
}

type RazorpayOrderResult = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
};

export async function createRazorpayOrder(
  userId: string,
  plan: BillingPlanDefinition,
  selectedPlanId: string,
  sessionRole: BillingRole
): Promise<RazorpayOrderResult> {
  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: plan.amountRs * 100, // paise
      currency: 'INR',
      receipt: `${userId}_${selectedPlanId}_${Date.now()}`.slice(0, 40),
      notes: {
        userId,
        planId: selectedPlanId,
        planType: plan.planType,
        role: sessionRole,
      },
    });

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount as number,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID ?? '',
    };
  } catch (error: unknown) {
    logger.error({ error, userId, selectedPlanId }, 'Razorpay order creation failed');
    throw error;
  }
}
