import { NextRequest } from 'next/server';
import { z } from 'zod';

import { forbidden, ok, parseQuery, paymentRequired, unauthorized } from '@/lib/api';
import { requireSession } from '@/lib/api/auth';
import { AppError, handleRouteError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { getEntitlementStatus } from '@/lib/services/billing/entitlementService';
import { findProcessedPaymentEventBySessionId } from '@/lib/services/billing/paymentEventService';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const verifyPaymentQuerySchema = z.object({
  session_id: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if ('error' in auth) {
    return auth.error;
  }

  const parsed = parseQuery(request, verifyPaymentQuerySchema);
  if ('error' in parsed) {
    return parsed.error;
  }

  try {
    const userId = auth.session.user.id;
    if (!userId) {
      return unauthorized();
    }
    const sessionId = parsed.data.session_id;
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.metadata?.userId !== userId) {
      return forbidden('Checkout session does not belong to the authenticated user');
    }

    if (checkoutSession.payment_status !== 'paid') {
      return paymentRequired('Payment has not been completed yet', {
        paymentStatus: checkoutSession.payment_status,
      });
    }

    const processedEvent = await findProcessedPaymentEventBySessionId(checkoutSession.id);

    if (processedEvent?.status === 'processed') {
      const subscription = await getEntitlementStatus(userId);
      return ok({
        status: 'processed',
        message: 'Subscription activated successfully',
        subscription,
      });
    }

    if (processedEvent?.status === 'failed') {
      throw new AppError(
        'INTERNAL_ERROR',
        processedEvent.failureReason || 'Payment was received but activation failed',
        500
      );
    }

    return ok({
      status: 'pending',
      message: 'Payment confirmed, activating subscription...',
    });
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/subscription/verify-payment]');
    return handleRouteError(error);
  }
}
