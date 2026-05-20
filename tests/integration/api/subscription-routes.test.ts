import crypto from 'crypto';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
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
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SITE_URL: undefined,
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'test_secret',
  },
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn(() => ({ valid: true })),
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('@/lib/razorpay', () => ({
  razorpay: {
    orders: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/services/billing/plans', () => ({
  getPlanById: jest.fn(),
  resolvePlanId: jest.fn(),
  roleSupportsPaidPlan: jest.fn(),
}));

jest.mock('@/lib/services/billing/subscriptionStatus', () => ({
  getFixerSubscriptionStatus: jest.fn(),
  getHirerSubscriptionStatus: jest.fn(),
}));

jest.mock('@/lib/services/billing/entitlementService', () => ({
  getEntitlementStatus: jest.fn(),
  grantSubscriptionEntitlement: jest.fn(),
  revokeSubscriptionEntitlement: jest.fn(),
}));

jest.mock('@/lib/services/billing/paymentEventService', () => ({
  recordPaymentEvent: jest.fn(),
  markEventProcessed: jest.fn(),
  markEventFailed: jest.fn(),
}));

jest.mock('@/lib/ably/publisher', () => ({
  publishToChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

// parseBody from lib/api/parse calls schema.parse() (not safeParse).
jest.mock('@/lib/validations/subscription', () => ({
  CreateOrderSchema: {
    safeParse: jest.fn(),
    parse: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { POST as createOrder } from '@/app/api/subscription/create-order/route';
import { GET as getFixerSub } from '@/app/api/subscription/fixer/route';
import { GET as getHirerSub } from '@/app/api/subscription/hirer/route';
import { POST as verifyPayment } from '@/app/api/subscription/verify-payment/route';
import { razorpay } from '@/lib/razorpay';
import { redisUtils } from '@/lib/redis';
import {
  getEntitlementStatus,
} from '@/lib/services/billing/entitlementService';
import {
  recordPaymentEvent,
} from '@/lib/services/billing/paymentEventService';
import {
  getPlanById,
  resolvePlanId,
  roleSupportsPaidPlan,
} from '@/lib/services/billing/plans';
import {
  getFixerSubscriptionStatus,
  getHirerSubscriptionStatus,
} from '@/lib/services/billing/subscriptionStatus';
import User from '@/models/User';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';

const TEST_KEY_SECRET = 'test_secret';

function makePOSTRequest(url: string, body: object): NextRequest {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function makeGetRequest(url: string): NextRequest {
  const parsedUrl = new URL(url);
  const req = new Request(url, {
    method: 'GET',
    headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
  });
  return Object.assign(req, {
    nextUrl: parsedUrl,
  }) as unknown as NextRequest;
}

function makeRazorpaySignature(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', TEST_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

function makeVerifyRequest(body: object): NextRequest {
  return new Request('http://localhost/api/subscription/verify-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function mockCreateOrderSchema(data: object) {
  const { CreateOrderSchema } = require('@/lib/validations/subscription');
  (CreateOrderSchema.parse as jest.Mock).mockReturnValue(data);
  (CreateOrderSchema.safeParse as jest.Mock).mockReturnValue({ success: true, data });
}

// ─────────────────────────────────────────────
// create-order tests
// ─────────────────────────────────────────────
describe('POST /api/subscription/create-order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { rateLimit } = require('@/utils/rateLimiting');
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await createOrder(makePOSTRequest('http://localhost/api/subscription/create-order', { plan: 'hirer_monthly' }));

    expect(response.status).toBe(401);
  });

  it('returns 403 when role does not support paid plans', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(false);

    mockCreateOrderSchema({ planId: 'hirer_monthly', plan: 'hirer_monthly', role: undefined });

    const response = await createOrder(makePOSTRequest('http://localhost/api/subscription/create-order', { plan: 'hirer_monthly' }));

    expect(response.status).toBe(403);
  });

  it('returns 400 when planId cannot be resolved', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(true);
    (resolvePlanId as jest.Mock).mockReturnValue(null);

    mockCreateOrderSchema({ planId: 'invalid_plan', plan: 'invalid_plan', role: undefined });

    const response = await createOrder(makePOSTRequest('http://localhost/api/subscription/create-order', { plan: 'invalid_plan' }));

    expect(response.status).toBe(400);
  });

  it('returns 404 when user is not found in database', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(true);
    (resolvePlanId as jest.Mock).mockReturnValue('hirer_monthly');
    (getPlanById as jest.Mock).mockReturnValue({
      id: 'hirer_monthly',
      displayName: 'Hirer Pro Monthly',
      planType: 'pro',
      billingCycle: 'monthly',
      amountRs: 99,
    });

    mockCreateOrderSchema({ planId: 'hirer_monthly', plan: 'hirer_monthly', role: undefined });

    (User.findById as jest.Mock).mockResolvedValue(null);

    const response = await createOrder(makePOSTRequest('http://localhost/api/subscription/create-order', { plan: 'hirer_monthly' }));

    expect(response.status).toBe(404);
  });

  it('returns 409 when user already has an active subscription', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(true);
    (resolvePlanId as jest.Mock).mockReturnValue('hirer_monthly');
    (getPlanById as jest.Mock).mockReturnValue({
      id: 'hirer_monthly',
      displayName: 'Hirer Pro Monthly',
      planType: 'pro',
      billingCycle: 'monthly',
      amountRs: 99,
    });

    mockCreateOrderSchema({ planId: 'hirer_monthly', plan: 'hirer_monthly', role: undefined });

    (User.findById as jest.Mock).mockResolvedValue({
      _id: 'test-user-hirer-id',
      email: 'test-hirer@example.com',
      role: 'hirer',
      banned: false,
      isActive: true,
      deletedAt: null,
      plan: {
        status: 'active',
        type: 'pro',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const response = await createOrder(makePOSTRequest('http://localhost/api/subscription/create-order', { plan: 'hirer_monthly' }));

    expect(response.status).toBe(409);
  });

  it('returns 201 with Razorpay order on success', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(true);
    (resolvePlanId as jest.Mock).mockReturnValue('hirer_monthly');
    (getPlanById as jest.Mock).mockReturnValue({
      id: 'hirer_monthly',
      displayName: 'Hirer Pro Monthly',
      planType: 'pro',
      billingCycle: 'monthly',
      amountRs: 99,
    });

    mockCreateOrderSchema({ planId: 'hirer_monthly', plan: 'hirer_monthly', role: undefined });

    const mockUser = {
      _id: 'test-user-hirer-id',
      email: 'test-hirer@example.com',
      role: 'hirer',
      banned: false,
      isActive: true,
      deletedAt: null,
      plan: { status: 'free', type: 'free' },
      pendingOrder: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const mockRazorpayOrder = {
      id: 'order_test_abc123',
      amount: 9900,
      currency: 'INR',
    };
    (razorpay.orders.create as jest.Mock).mockResolvedValue(mockRazorpayOrder);
    (redisUtils.del as jest.Mock).mockResolvedValue(true);

    const response = await createOrder(makePOSTRequest('http://localhost/api/subscription/create-order', { plan: 'hirer_monthly' }));
    const body = await response.json() as { data: { orderId: string; amount: number; currency: string; keyId: string } };

    expect(response.status).toBe(201);
    expect(body.data.orderId).toBe('order_test_abc123');
    expect(body.data.amount).toBe(9900);
    expect(body.data.currency).toBe('INR');
    expect(body.data.keyId).toBeDefined();
  });

  it('returns 429 when rate limited', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    const { rateLimit } = require('@/utils/rateLimiting');
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    mockCreateOrderSchema({ planId: 'hirer_monthly', plan: 'hirer_monthly', role: undefined });
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(true);

    const response = await createOrder(makePOSTRequest('http://localhost/api/subscription/create-order', { plan: 'hirer_monthly' }));

    expect(response.status).toBe(429);
  });
});

// ─────────────────────────────────────────────
// fixer subscription tests
// ─────────────────────────────────────────────
describe('GET /api/subscription/fixer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisUtils.get as jest.Mock).mockResolvedValue(null);
    (redisUtils.set as jest.Mock).mockResolvedValue(true);
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await getFixerSub(makeGetRequest('http://localhost/api/subscription/fixer'));

    expect(response.status).toBe(401);
  });

  it('returns 403 when user is a hirer not a fixer', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await getFixerSub(makeGetRequest('http://localhost/api/subscription/fixer'));

    expect(response.status).toBe(403);
  });

  it('returns 404 when fixer user not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));
    (User.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const response = await getFixerSub(makeGetRequest('http://localhost/api/subscription/fixer'));

    expect(response.status).toBe(404);
  });

  it('returns 200 with fixer subscription status', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const mockUser = {
      _id: 'test-user-fixer-id',
      role: 'fixer',
      banned: false,
      isActive: true,
      deletedAt: null,
      plan: { status: 'free', type: 'free' },
    };
    (User.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(mockUser) });

    const mockStatus = {
      plan: { type: 'free', status: 'active', isActive: false },
      eligibility: { canApplyToJobs: true, maxActiveApplications: 5 },
    };
    (getFixerSubscriptionStatus as jest.Mock).mockReturnValue(mockStatus);

    const response = await getFixerSub(makeGetRequest('http://localhost/api/subscription/fixer'));
    const body = await response.json() as { data: { plan: unknown } };

    expect(response.status).toBe(200);
    expect(body.data.plan).toBeDefined();
  });

  it('returns cached response when available', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const cachedStatus = {
      plan: { type: 'pro', status: 'active', isActive: true },
    };
    (redisUtils.get as jest.Mock).mockResolvedValue(cachedStatus);

    const response = await getFixerSub(makeGetRequest('http://localhost/api/subscription/fixer'));

    expect(response.status).toBe(200);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('returns 403 when fixer is banned', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const mockUser = {
      _id: 'test-user-fixer-id',
      role: 'fixer',
      banned: true,
      isActive: true,
      deletedAt: null,
    };
    (User.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(mockUser) });

    const response = await getFixerSub(makeGetRequest('http://localhost/api/subscription/fixer'));

    expect(response.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// hirer subscription tests
// ─────────────────────────────────────────────
describe('GET /api/subscription/hirer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisUtils.get as jest.Mock).mockResolvedValue(null);
    (redisUtils.set as jest.Mock).mockResolvedValue(true);
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await getHirerSub(makeGetRequest('http://localhost/api/subscription/hirer'));

    expect(response.status).toBe(401);
  });

  it('returns 403 when user is a fixer not a hirer', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const response = await getHirerSub(makeGetRequest('http://localhost/api/subscription/hirer'));

    expect(response.status).toBe(403);
  });

  it('returns 404 when hirer user not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (User.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const response = await getHirerSub(makeGetRequest('http://localhost/api/subscription/hirer'));

    expect(response.status).toBe(404);
  });

  it('returns 200 with hirer subscription status', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockUser = {
      _id: 'test-user-hirer-id',
      role: 'hirer',
      banned: false,
      isActive: true,
      deletedAt: null,
      plan: { status: 'free', type: 'free' },
    };
    (User.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(mockUser) });

    const mockStatus = {
      plan: { type: 'free', status: 'active', isActive: false },
      eligibility: { canPostJobs: true, maxActiveJobs: 3 },
    };
    (getHirerSubscriptionStatus as jest.Mock).mockReturnValue(mockStatus);

    const response = await getHirerSub(makeGetRequest('http://localhost/api/subscription/hirer'));
    const body = await response.json() as { data: { plan: unknown } };

    expect(response.status).toBe(200);
    expect(body.data.plan).toBeDefined();
  });

  it('returns 403 when hirer account is inactive', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockUser = {
      _id: 'test-user-hirer-id',
      role: 'hirer',
      banned: false,
      isActive: false,
      deletedAt: null,
    };
    (User.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(mockUser) });

    const response = await getHirerSub(makeGetRequest('http://localhost/api/subscription/hirer'));

    expect(response.status).toBe(403);
  });
});

// ─────────────────────────────────────────────
// verify-payment tests (POST with Razorpay signature)
// ─────────────────────────────────────────────
describe('POST /api/subscription/verify-payment', () => {
  const orderId = 'order_test_abc';
  const paymentId = 'pay_test_xyz';
  const signature = makeRazorpaySignature(orderId, paymentId);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await verifyPayment(
      makeVerifyRequest({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature })
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 when signature verification fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await verifyPayment(
      makeVerifyRequest({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: 'bad_signature' })
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when user has no pending order', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (User.findById as jest.Mock).mockResolvedValue({
      _id: 'test-user-hirer-id',
      pendingOrder: null,
    });

    const response = await verifyPayment(
      makeVerifyRequest({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature })
    );

    expect(response.status).toBe(400);
  });

  it('returns 200 with processed status for duplicate payment', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (User.findById as jest.Mock).mockResolvedValue({
      _id: 'test-user-hirer-id',
      pendingOrder: { orderId, planId: 'hirer_monthly', plan: 'monthly', amount: 99 },
    });

    (recordPaymentEvent as jest.Mock).mockResolvedValue({ isNew: false });

    const mockSubscription = { plan: { type: 'pro', status: 'active', isActive: true } };
    (getEntitlementStatus as jest.Mock).mockResolvedValue(mockSubscription);

    const response = await verifyPayment(
      makeVerifyRequest({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature })
    );
    const body = await response.json() as { data: { status: string; subscription: unknown } };

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('processed');
    expect(body.data.subscription).toBeDefined();
  });

  it('returns 200 with processed status and activates subscription on success', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockUser = {
      _id: 'test-user-hirer-id',
      email: 'hirer@test.com',
      name: 'Test Hirer',
      pendingOrder: { orderId, planId: 'hirer_monthly', plan: 'monthly', amount: 99 },
    };
    (User.findById as jest.Mock)
      .mockResolvedValueOnce(mockUser)  // first call (find user)
      .mockReturnValueOnce({            // second call (refreshed user)
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'test-user-hirer-id',
            email: 'hirer@test.com',
            name: 'Test Hirer',
            plan: { endDate: new Date(Date.now() + 86400000) },
          }),
        }),
      });

    (recordPaymentEvent as jest.Mock).mockResolvedValue({ isNew: true });

    const { grantSubscriptionEntitlement } = require('@/lib/services/billing/entitlementService');
    (grantSubscriptionEntitlement as jest.Mock).mockResolvedValue(undefined);

    const { markEventProcessed } = require('@/lib/services/billing/paymentEventService');
    (markEventProcessed as jest.Mock).mockResolvedValue(undefined);

    const mockSubscription = { plan: { type: 'pro', status: 'active', isActive: true } };
    (getEntitlementStatus as jest.Mock).mockResolvedValue(mockSubscription);

    const response = await verifyPayment(
      makeVerifyRequest({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature })
    );
    const body = await response.json() as { data: { status: string; subscription: unknown } };

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('processed');
    expect(body.data.subscription).toBeDefined();
  });
});
