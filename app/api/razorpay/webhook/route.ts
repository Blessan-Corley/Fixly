import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

import { handlePaymentCaptured } from './handlers/paymentCaptured';
import { handlePaymentFailed } from './handlers/paymentFailed';
import { handleRefundCreated } from './handlers/refundCreated';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn({ signature }, 'Razorpay webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } else {
    logger.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification');
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = (body as { event?: string }).event;
  logger.info({ event }, 'Razorpay webhook received');

  try {
    switch (event) {
      case 'payment.captured':
        return await handlePaymentCaptured(body as Parameters<typeof handlePaymentCaptured>[0]);
      case 'payment.failed':
        return await handlePaymentFailed(body as Parameters<typeof handlePaymentFailed>[0]);
      case 'refund.created':
        return await handleRefundCreated(body as Parameters<typeof handleRefundCreated>[0]);
      default:
        logger.info({ event }, 'Razorpay webhook event not handled');
        return NextResponse.json({ received: true }, { status: 200 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ event, error: message }, 'Razorpay webhook handler threw');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
