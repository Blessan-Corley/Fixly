// Phase 2: Updated subscription order creation to validate CSRF against the authenticated session.
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
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { csrfGuard } from '@/lib/security/csrf';
import {
  getPlanById,
  resolvePlanId,
  roleSupportsPaidPlan,
  type BillingRole,
} from '@/lib/services/billing/plans';
import { stripe } from '@/lib/stripe';
import { CreateOrderSchema } from '@/lib/validations/subscription';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: NextRequest): string {
  const configuredUrl = env.NEXTAUTH_URL?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function invalidateSubscriptionCache(userId: string, role: BillingRole): Promise<boolean[]> {
  return Promise.all([
    redisUtils.del(`subscription:${role}:${userId}`),
    redisUtils.del(`dashboard:stats:${userId}`),
  ]);
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const incomingRequest = request;
    const userId = auth.session.user.id;
    const sessionRole = auth.session.user.role;

    if (!userId) {
      return unauthorized();
    }

    const csrfResult = csrfGuard(incomingRequest, auth.session);
    if (csrfResult) {
      return csrfResult;
    }

    const rateLimitResult = await rateLimit(incomingRequest, 'create_order', 5, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many order creation attempts. Please try again later.');
    }

    const parsed = await parseBody(incomingRequest, CreateOrderSchema);
    if ('error' in parsed) {
      return parsed.error;
    }

    if (!roleSupportsPaidPlan(sessionRole)) {
      return forbidden('Only hirers and fixers can purchase subscriptions');
    }

    const selectedPlanId = resolvePlanId(sessionRole, parsed.data.planId ?? parsed.data.plan);
    if (!selectedPlanId) {
      return badRequest('Invalid plan selection for your role');
    }

    const plan = getPlanById(selectedPlanId);
    const requestRole = parsed.data.role;
    if (requestRole && requestRole !== sessionRole) {
      return forbidden('Plan role does not match the authenticated user');
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return notFound('User');
    }

    if (user.role !== sessionRole) {
      return forbidden('Role mismatch for subscription checkout');
    }

    if (user.banned || user.isActive === false || user.deletedAt) {
      return forbidden('Account is not eligible for billing');
    }

    const existingPlanEnd = user.plan?.endDate ?? user.plan?.expiresAt;
    const hasActivePlan =
      user.plan?.status === 'active' &&
      user.plan?.type === 'pro' &&
      (!existingPlanEnd || new Date(existingPlanEnd).getTime() > Date.now());

    if (hasActivePlan) {
      return conflict('You already have an active subscription');
    }

    const baseUrl = getBaseUrl(incomingRequest);
    const successUrl = `${baseUrl}/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/dashboard/subscription?cancelled=true`;

    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: plan.displayName,
                description: `${plan.displayName} subscription`,
              },
              unit_amount: plan.amountRs * 100,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: String(user._id),
          planId: selectedPlanId,
          planType: plan.planType,
          role: sessionRole,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      user.pendingOrder = {
        orderId: checkoutSession.id,
        sessionId: checkoutSession.id,
        amount: plan.amountRs,
        plan: plan.billingCycle,
        planId: selectedPlanId,
        status: 'pending',
        createdAt: new Date(),
      };
      await user.save();
      await invalidateSubscriptionCache(userId, sessionRole);

      return created({
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
        plan: {
          id: plan.id,
          displayName: plan.displayName,
          amountRs: plan.amountRs,
          billingCycle: plan.billingCycle,
        },
      });
    } catch (error: unknown) {
      logger.error({ error, userId, selectedPlanId }, 'Stripe checkout session creation failed');
      throw new AppError(
        'INTERNAL_ERROR',
        'Failed to create payment session. Please try again.',
        500
      );
    }
  } catch (error: unknown) {
    logger.error({ error }, '[POST /api/subscription/create-order]');
    return handleRouteError(error);
  }
}
