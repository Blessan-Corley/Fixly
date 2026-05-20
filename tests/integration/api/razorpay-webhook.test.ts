import crypto from 'crypto';

jest.mock('@/lib/mongodb', () => jest.fn().mockResolvedValue(undefined));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: {
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'test_secret',
    RAZORPAY_WEBHOOK_SECRET: 'webhook_secret',
  },
}));

jest.mock('@/lib/services/billing/paymentEventService', () => ({
  recordPaymentEvent: jest.fn().mockResolvedValue({ isNew: true }),
  markEventProcessed: jest.fn().mockResolvedValue(undefined),
  markEventFailed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/billing/entitlementService', () => ({
  grantSubscriptionEntitlement: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          plan: { endDate: new Date(Date.now() + 86400000) },
        }),
      }),
    }),
  },
}));

import type { NextRequest } from 'next/server';

import { POST } from '@/app/api/razorpay/webhook/route';
import {
  grantSubscriptionEntitlement,
} from '@/lib/services/billing/entitlementService';
import {
  markEventProcessed,
  recordPaymentEvent,
} from '@/lib/services/billing/paymentEventService';

const WEBHOOK_SECRET = 'webhook_secret';

function makeSignature(body: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

function makeRequest(body: object, signature?: string): NextRequest {
  const rawBody = JSON.stringify(body);
  const sig = signature ?? makeSignature(rawBody);
  return {
    method: 'POST',
    url: 'http://localhost/api/razorpay/webhook',
    headers: new Headers({
      'content-type': 'application/json',
      'x-razorpay-signature': sig,
    }),
    text: jest.fn(async () => rawBody),
  } as unknown as NextRequest;
}

function makePaymentEvent(type: string, notes?: Record<string, string>) {
  return {
    event: type,
    payload: {
      payment: {
        entity: {
          id: 'pay_test_001',
          order_id: 'order_test_001',
          amount: 49900,
          currency: 'INR',
          status: type === 'payment.captured' ? 'captured' : 'failed',
          notes: notes ?? { userId: 'user123', planId: 'fixer_pro_monthly', planType: 'pro' },
        },
      },
    },
  };
}

describe('POST /api/razorpay/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when signature is invalid', async () => {
    const body = makePaymentEvent('payment.captured');
    const req = makeRequest(body, 'invalid_signature');
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('returns 200 and processes payment.captured event', async () => {
    const body = makePaymentEvent('payment.captured');
    const req = makeRequest(body);
    const response = await POST(req);
    const json = await response.json() as { received: boolean; error?: string };
    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
  });

  it('returns 200 for payment.failed event', async () => {
    const body = makePaymentEvent('payment.failed');
    const req = makeRequest(body);
    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  it('returns 200 for unknown events', async () => {
    const body = { event: 'order.paid', payload: {} };
    const req = makeRequest(body);
    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  it('skips processing if userId or planId is missing from notes', async () => {
    const body = makePaymentEvent('payment.captured', {});
    const req = makeRequest(body);
    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('returns 200 with duplicate:true and skips entitlement when the same payment is received twice', async () => {
    // Second delivery of the same event: recordPaymentEvent signals isNew:false
    (recordPaymentEvent as jest.Mock).mockResolvedValueOnce({ isNew: false });

    const body = makePaymentEvent('payment.captured');
    const req = makeRequest(body);
    const response = await POST(req);
    const json = await response.json() as { received: boolean; duplicate?: boolean };

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.duplicate).toBe(true);

    // Must NOT re-grant entitlements or re-mark the event
    expect(grantSubscriptionEntitlement).not.toHaveBeenCalled();
    expect(markEventProcessed).not.toHaveBeenCalled();
  });

  // ── Signature verification ────────────────────────────────────────────────

  it('returns 400 with an error message for a bad signature', async () => {
    const body = makePaymentEvent('payment.captured');
    const req = makeRequest(body, 'bad_signature');
    const response = await POST(req);
    const json = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/signature/i);
  });

  it('returns 400 when the request body is not valid JSON', async () => {
    const sig = makeSignature('not-json');
    const req = {
      method: 'POST',
      url: 'http://localhost/api/razorpay/webhook',
      headers: new Headers({
        'content-type': 'application/json',
        'x-razorpay-signature': sig,
      }),
      text: jest.fn(async () => 'not-json'),
    } as unknown as NextRequest;

    const response = await POST(req);
    expect(response.status).toBe(400);
    const json = await response.json() as { error: string };
    expect(json.error).toMatch(/json/i);
  });

  // ── Event coverage ────────────────────────────────────────────────────────

  it('calls grantSubscriptionEntitlement and markEventProcessed on first payment.captured', async () => {
    const body = makePaymentEvent('payment.captured');
    const req = makeRequest(body);
    await POST(req);

    expect(grantSubscriptionEntitlement).toHaveBeenCalledWith(
      'user123',
      expect.objectContaining({
        paymentId: 'pay_test_001',
        orderId: 'order_test_001',
        planId: 'fixer_pro_monthly',
      })
    );
    expect(markEventProcessed).toHaveBeenCalledWith('pay_test_001');
  });
});
