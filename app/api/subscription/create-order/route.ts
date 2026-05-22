import { NextRequest } from 'next/server';

import {
  badRequest,
  conflict,
  created,
  forbidden,
  notFound,
  parseBody,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { requireSession } from '@/lib/api/auth';
import { AppError, handleRouteError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import {
  getPlanById,
  resolvePlanId,
  roleSupportsPaidPlan,
} from '@/lib/services/billing/plans';
import { CreateOrderSchema } from '@/lib/validations/subscription';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  acquireOrderLock,
  createRazorpayOrder,
  invalidateSubscriptionCache,
  releaseOrderLock,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  try {
    const userId = auth.session.user.id;
    const sessionRole = auth.session.user.role;

    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const rateLimitResult = await rateLimit(request, 'create_order', 5, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many order creation attempts. Please try again later.');
    }

    const lockAcquired = await acquireOrderLock(userId);
    if (!lockAcquired) {
      return tooManyRequests('An order is already being created. Please wait a moment.');
    }

    try {
      const parsed = await parseBody(request, CreateOrderSchema);
      if ('error' in parsed) return parsed.error;

      if (!roleSupportsPaidPlan(sessionRole)) {
        return forbidden('Only hirers and fixers can purchase subscriptions');
      }

      const selectedPlanId = resolvePlanId(sessionRole, parsed.data.planId ?? parsed.data.plan);
      if (!selectedPlanId) return badRequest('Invalid plan selection for your role');

      const plan = getPlanById(selectedPlanId);
      const requestRole = parsed.data.role;
      if (requestRole && requestRole !== sessionRole) {
        return forbidden('Plan role does not match the authenticated user');
      }

      await connectDB();

      const user = await User.findById(userId);
      if (!user) return notFound('User');
      if (user.role !== sessionRole) return forbidden('Role mismatch for subscription checkout');
      if (user.banned || user.isActive === false || user.deletedAt) {
        return forbidden('Account is not eligible for billing');
      }

      const existingPlanEnd = user.plan?.endDate ?? user.plan?.expiresAt;
      const hasActivePlan =
        user.plan?.status === 'active' &&
        user.plan?.type === 'pro' &&
        (!existingPlanEnd || new Date(existingPlanEnd).getTime() > Date.now());

      if (hasActivePlan) return conflict('You already have an active subscription');

      if (user.pendingOrder?.orderId) {
        logger.info(
          { userId, staleOrderId: user.pendingOrder.orderId },
          'Overwriting existing pending order with new order'
        );
      }

      const order = await createRazorpayOrder(userId, plan, selectedPlanId, sessionRole);

      user.pendingOrder = {
        orderId: order.orderId,
        sessionId: order.orderId,
        amount: plan.amountRs,
        plan: plan.billingCycle,
        planId: selectedPlanId,
        status: 'pending',
        createdAt: new Date(),
      };
      await user.save();
      await invalidateSubscriptionCache(userId, sessionRole);

      return created({
        ...order,
        plan: {
          id: plan.id,
          displayName: plan.displayName,
          amountRs: plan.amountRs,
          billingCycle: plan.billingCycle,
        },
      });
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      throw new AppError('INTERNAL_ERROR', 'Failed to create payment order. Please try again.', 500);
    } finally {
      await releaseOrderLock(userId);
    }
  } catch (error: unknown) {
    logger.error({ error }, '[POST /api/subscription/create-order]');
    return handleRouteError(error);
  }
}
