import { Types } from 'mongoose';
import { NextRequest } from 'next/server';

import { badRequest, ok, parseBody, unauthorized } from '@/lib/api';
import { requireSession } from '@/lib/api/auth';
import { AppError, handleRouteError } from '@/lib/api/errors';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import {
  grantSubscriptionEntitlement,
  getEntitlementStatus,
} from '@/lib/services/billing/entitlementService';
import {
  markEventFailed,
  markEventProcessed,
  recordPaymentEvent,
} from '@/lib/services/billing/paymentEventService';
import type { PlanId } from '@/lib/services/billing/plans';
import User from '@/models/User';
import type { IUser } from '@/types/User';

import {
  notifySubscriptionActivated,
  verifyPaymentBodySchema,
  verifyRazorpaySignature,
} from './verify-payment.helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  const csrfResult = csrfGuard(request, auth.session);
  if (csrfResult) return csrfResult;

  const parsed = await parseBody(request, verifyPaymentBodySchema);
  if ('error' in parsed) return parsed.error;

  try {
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new AppError('INTERNAL_ERROR', 'Payment configuration error', 500);

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret)) {
      return badRequest('Payment signature verification failed');
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    const pendingPlanId = user.pendingOrder?.planId;
    const pendingOrderId = user.pendingOrder?.orderId;

    if (!pendingPlanId || !pendingOrderId) {
      throw new AppError('VALIDATION_ERROR', 'No pending order found for this user', 400);
    }

    if (pendingOrderId !== razorpay_order_id) {
      logger.warn(
        { userId, pendingOrderId, receivedOrderId: razorpay_order_id },
        'verify-payment order ID mismatch — possible replay or stale order'
      );
      return badRequest('Order ID does not match the active order for this account');
    }

    const { isNew } = await recordPaymentEvent(
      razorpay_payment_id,
      'payment.captured',
      userId,
      { order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature: razorpay_signature }
    );

    if (!isNew) {
      logger.info({ razorpay_payment_id, userId }, 'Duplicate payment verification ignored');
      const subscription = await getEntitlementStatus(userId);
      return ok({ status: 'processed', message: 'Subscription already activated', subscription });
    }

    try {
      await grantSubscriptionEntitlement(userId, {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        planId: pendingPlanId as PlanId,
        planType: user.pendingOrder?.plan ?? 'pro',
      });
      await markEventProcessed(razorpay_payment_id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown entitlement error';
      await markEventFailed(razorpay_payment_id, message);
      throw error;
    }

    const refreshedUser = await User.findById(userId).select('email name plan').lean<{
      _id: Types.ObjectId;
      email?: string;
      name?: string;
      plan?: IUser['plan'];
    } | null>();

    await notifySubscriptionActivated(
      userId,
      pendingPlanId,
      razorpay_order_id,
      razorpay_payment_id,
      user.pendingOrder?.amount ?? 0,
      refreshedUser
    );

    const subscription = await getEntitlementStatus(userId);
    return ok({ status: 'processed', message: 'Subscription activated successfully', subscription });
  } catch (error: unknown) {
    logger.error({ error }, '[POST /api/subscription/verify-payment]');
    return handleRouteError(error);
  }
}
