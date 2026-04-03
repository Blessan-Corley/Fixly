jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    checkout: {
      sessions: {
        retrieve: jest.fn(),
      },
    },
    charges: {
      retrieve: jest.fn(),
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
  },
}));

jest.mock('@/lib/stripe/webhookIdempotency', () => ({
  isWebhookProcessed: jest.fn().mockResolvedValue(false),
  markWebhookProcessed: jest.fn().mockResolvedValue(undefined),
  clearWebhookProcessed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/ably/events', () => ({
  Channels: {
    user: jest.fn((id: string) => `user:${id}`),
  },
  Events: {
    user: {
      subscriptionActivated: 'subscription-activated',
    },
  },
}));

jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/services/billing/entitlementService', () => ({
  grantSubscriptionEntitlement: jest.fn().mockResolvedValue(undefined),
  revokeSubscriptionEntitlement: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/billing/paymentEventService', () => ({
  recordPaymentEvent: jest.fn(),
  markEventProcessed: jest.fn().mockResolvedValue(undefined),
  markEventFailed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/notifications', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue(undefined),
    notifyDisputeUpdate: jest.fn().mockResolvedValue(undefined),
  },
  NOTIFICATION_TYPES: {
    PAYMENT_FAILED: 'payment_failed',
  },
}));

import type { NextRequest } from 'next/server';

import { POST } from '@/app/api/stripe/webhook/route';
import { stripe } from '@/lib/stripe';
import {
  isWebhookProcessed,
  markWebhookProcessed,
  clearWebhookProcessed,
} from '@/lib/stripe/webhookIdempotency';
import {
  grantSubscriptionEntitlement,
  revokeSubscriptionEntitlement,
} from '@/lib/services/billing/entitlementService';
import {
  recordPaymentEvent,
  markEventProcessed,
} from '@/lib/services/billing/paymentEventService';
import User from '@/models/User';

const STRIPE_SIG = 'stripe-test-signature';
const USER_ID = '507f1f77bcf86cd799439011';

function makeWebhookRequest(body: string, signature?: string): NextRequest {
  const headers = new Headers({
    'content-type': 'application/json',
  });
  if (signature !== undefined) {
    if (signature !== '') {
      headers.set('stripe-signature', signature);
    }
  } else {
    headers.set('stripe-signature', STRIPE_SIG);
  }

  // Plain `Request` in jsdom doesn't implement `.text()`, so we add it manually.
  const req = new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  });

  // Polyfill `.text()` for jsdom environment
  if (typeof (req as unknown as { text?: () => Promise<string> }).text !== 'function') {
    (req as unknown as { text: () => Promise<string> }).text = () => Promise.resolve(body);
  }

  return req as unknown as NextRequest;
}

function makeStripeEvent(type: string, objectData: object, eventId = 'evt_test_001') {
  return {
    id: eventId,
    type,
    data: { object: objectData },
  };
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isWebhookProcessed as jest.Mock).mockResolvedValue(false);
    (markWebhookProcessed as jest.Mock).mockResolvedValue(undefined);
    (clearWebhookProcessed as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const rawBody = '{}';
    const req = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: rawBody,
    });
    (req as unknown as { text: () => Promise<string> }).text = () => Promise.resolve(rawBody);
    const request = req as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('returns 400 when stripe signature verification fails', async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    const response = await POST(makeWebhookRequest('{"type":"test"}', 'bad-signature'));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('returns 200 with duplicate=true for already-processed event', async () => {
    const event = makeStripeEvent('checkout.session.completed', {});
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(event);
    (isWebhookProcessed as jest.Mock).mockResolvedValue(true);

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(markWebhookProcessed).not.toHaveBeenCalled();
  });

  it('processes checkout.session.completed and returns 200', async () => {
    const checkoutSessionObject = {
      id: 'cs_test_abc',
      metadata: { userId: USER_ID, planId: 'hirer_monthly' },
      customer: null,
      customer_details: { email: 'test@example.com' },
    };

    const event = makeStripeEvent('checkout.session.completed', checkoutSessionObject);
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      ...checkoutSessionObject,
      subscription: null,
      amount_total: 9900,
      currency: 'inr',
    });

    const mockUser = {
      _id: USER_ID,
      email: 'test@example.com',
      name: 'Test User',
      plan: { status: 'free', type: 'free' },
    };
    (User.findById as jest.Mock)
      .mockResolvedValueOnce(mockUser) // findUserForCheckoutSession
      .mockReturnValueOnce({           // User.findById(...).select(...).lean()
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUser),
      });

    (recordPaymentEvent as jest.Mock).mockResolvedValue({ isNew: true });
    (grantSubscriptionEntitlement as jest.Mock).mockResolvedValue(undefined);
    (markEventProcessed as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));

    expect(response.status).toBe(200);
    expect(grantSubscriptionEntitlement).toHaveBeenCalledWith(USER_ID, expect.any(Object));
    expect(markEventProcessed).toHaveBeenCalledWith(event.id);
  });

  it('returns 200 for checkout.session.completed when user cannot be resolved', async () => {
    const checkoutSessionObject = {
      id: 'cs_test_no_user',
      metadata: { userId: 'unknown-user-id' },
      customer: null,
      customer_details: null,
    };

    const event = makeStripeEvent('checkout.session.completed', checkoutSessionObject);
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      ...checkoutSessionObject,
      subscription: null,
      amount_total: 0,
      currency: 'inr',
    });

    (User.findById as jest.Mock).mockResolvedValue(null);
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));

    expect(response.status).toBe(200);
    expect(grantSubscriptionEntitlement).not.toHaveBeenCalled();
  });

  it('returns 200 with ignored=true for payment_intent.succeeded', async () => {
    const paymentIntentObject = {
      id: 'pi_test_001',
      amount: 9900,
    };

    const event = makeStripeEvent('payment_intent.succeeded', paymentIntentObject);
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ignored).toBe(true);
  });

  it('returns 200 and handles customer.subscription.deleted by revoking entitlement', async () => {
    const subscriptionObject = {
      id: 'sub_test_001',
      customer: 'cus_test_001',
      metadata: { userId: USER_ID },
    };

    const event = makeStripeEvent('customer.subscription.deleted', subscriptionObject);
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    const mockUser = { _id: USER_ID, email: 'test@example.com' };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));

    expect(response.status).toBe(200);
    expect(revokeSubscriptionEntitlement).toHaveBeenCalledWith(
      USER_ID,
      'stripe_subscription_cancelled'
    );
  });

  it('returns 200 for an unhandled event type', async () => {
    const event = makeStripeEvent('some.unknown.event', { id: 'obj_123' });
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toBe(false);
  });

  it('returns 500 and clears idempotency key on unexpected processing error', async () => {
    const checkoutSessionObject = {
      id: 'cs_test_err',
      metadata: { userId: USER_ID, planId: 'hirer_monthly' },
      customer: null,
      customer_details: { email: 'test@example.com' },
    };

    const event = makeStripeEvent('checkout.session.completed', checkoutSessionObject);
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      ...checkoutSessionObject,
      subscription: null,
      amount_total: 9900,
      currency: 'inr',
    });

    const mockUser = { _id: USER_ID, email: 'test@example.com', name: 'Test User' };
    (User.findById as jest.Mock).mockResolvedValueOnce(mockUser);

    (recordPaymentEvent as jest.Mock).mockResolvedValue({ isNew: true });
    (grantSubscriptionEntitlement as jest.Mock).mockRejectedValue(
      new Error('Entitlement service failure')
    );

    const response = await POST(makeWebhookRequest(JSON.stringify(event)));

    expect(response.status).toBe(500);
    expect(clearWebhookProcessed).toHaveBeenCalledWith(event.id);
  });
});
