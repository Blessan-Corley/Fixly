import crypto from 'crypto';

import { Types } from 'mongoose';
import { z } from 'zod';

import { Channels, Events, type SubscriptionActivatedPayload } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { inngest } from '@/lib/inngest/client';
import type { IUser } from '@/types/User';

export const verifyPaymentBodySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export type VerifyPaymentBody = z.infer<typeof verifyPaymentBodySchema>;

export function getPlanPeriodEndIso(user: { plan?: IUser['plan'] } | null): string | undefined {
  const planEnd = user?.plan?.endDate ?? user?.plan?.expiresAt;
  if (!planEnd) return undefined;
  return new Date(planEnd).toISOString();
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  return expected === signature;
}

export async function notifySubscriptionActivated(
  userId: string,
  pendingPlanId: string,
  orderId: string,
  paymentId: string,
  amount: number,
  refreshedUser: { _id: Types.ObjectId; email?: string; name?: string; plan?: IUser['plan'] } | null
): Promise<void> {
  await publishToChannel(Channels.user(userId), Events.user.subscriptionActivated, {
    planId: pendingPlanId,
    periodEnd: getPlanPeriodEndIso(refreshedUser),
    activatedAt: new Date().toISOString(),
    subscriptionId: orderId,
  } satisfies SubscriptionActivatedPayload);

  if (refreshedUser?.email) {
    await inngest.send({
      name: 'razorpay/payment.captured',
      data: {
        orderId,
        paymentId,
        userId,
        userEmail: refreshedUser.email,
        userName: refreshedUser.name ?? 'User',
        amount,
        currency: 'INR',
        planId: pendingPlanId,
        periodEnd: getPlanPeriodEndIso(refreshedUser),
      },
    });
  }
}
