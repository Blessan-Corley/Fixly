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

jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
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
  findProcessedPaymentEventBySessionId: jest.fn(),
  recordPaymentEvent: jest.fn(),
  markEventProcessed: jest.fn(),
  markEventFailed: jest.fn(),
}));

// parseBody from lib/api/parse calls schema.parse() (not safeParse).
// Provide both so tests can mock via CreateOrderSchema.parse.
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
import { GET as verifyPayment } from '@/app/api/subscription/verify-payment/route';
import { stripe } from '@/lib/stripe';
import { redisUtils } from '@/lib/redis';
import {
  getPlanById,
  resolvePlanId,
  roleSupportsPaidPlan,
} from '@/lib/services/billing/plans';
import {
  getFixerSubscriptionStatus,
  getHirerSubscriptionStatus,
} from '@/lib/services/billing/subscriptionStatus';
import {
  getEntitlementStatus,
} from '@/lib/services/billing/entitlementService';
import {
  findProcessedPaymentEventBySessionId,
} from '@/lib/services/billing/paymentEventService';
import User from '@/models/User';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';

function makePOSTRequest(body: object): NextRequest {
  return new Request('http://localhost/api/subscription/create-order', {
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
  // parseQuery() uses req.nextUrl.searchParams — add it to the request
  return Object.assign(req, {
    nextUrl: parsedUrl,
  }) as unknown as NextRequest;
}

/**
 * Helper to mock CreateOrderSchema for parseBody (which calls schema.parse()).
 * `parse` should return data directly (no success wrapper), and throw on failure.
 */
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
    // Default: rateLimit allows
    const { rateLimit } = require('@/utils/rateLimiting');
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await createOrder(makePOSTRequest({ plan: 'hirer_monthly' }));

    expect(response.status).toBe(401);
  });

  it('returns 403 when role does not support paid plans', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(false);

    mockCreateOrderSchema({ planId: 'hirer_monthly', plan: 'hirer_monthly', role: undefined });

    const response = await createOrder(makePOSTRequest({ plan: 'hirer_monthly' }));

    expect(response.status).toBe(403);
  });

  it('returns 400 when planId cannot be resolved', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(true);
    (resolvePlanId as jest.Mock).mockReturnValue(null);

    mockCreateOrderSchema({ planId: 'invalid_plan', plan: 'invalid_plan', role: undefined });

    const response = await createOrder(makePOSTRequest({ plan: 'invalid_plan' }));

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

    const response = await createOrder(makePOSTRequest({ plan: 'hirer_monthly' }));

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

    const response = await createOrder(makePOSTRequest({ plan: 'hirer_monthly' }));

    expect(response.status).toBe(409);
  });

  it('returns 201 with Stripe checkout session on success', async () => {
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

    const mockCheckoutSession = {
      id: 'cs_test_abc123',
      url: 'https://checkout.stripe.com/cs_test_abc123',
    };
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockCheckoutSession);
    (redisUtils.del as jest.Mock).mockResolvedValue(true);

    const response = await createOrder(makePOSTRequest({ plan: 'hirer_monthly' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.sessionId).toBe('cs_test_abc123');
    expect(body.data.url).toBe('https://checkout.stripe.com/cs_test_abc123');
  });

  it('returns 429 when rate limited', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    const { rateLimit } = require('@/utils/rateLimiting');
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    mockCreateOrderSchema({ planId: 'hirer_monthly', plan: 'hirer_monthly', role: undefined });
    (roleSupportsPaidPlan as unknown as jest.Mock).mockReturnValue(true);

    const response = await createOrder(makePOSTRequest({ plan: 'hirer_monthly' }));

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
    const body = await response.json();

    expect(response.status).toBe(200);
    // ok() wraps response in { success: true, data: ... }
    expect(body.data.plan).toBeDefined();
  });

  it('returns cached response when available', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('fixer'));

    const cachedStatus = {
      plan: { type: 'pro', status: 'active', isActive: true },
    };
    (redisUtils.get as jest.Mock).mockResolvedValue(cachedStatus);

    const response = await getFixerSub(makeGetRequest('http://localhost/api/subscription/fixer'));
    const body = await response.json();

    expect(response.status).toBe(200);
    // Should not have queried DB
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
    const body = await response.json();

    expect(response.status).toBe(200);
    // ok() wraps response in { success: true, data: ... }
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
// verify-payment tests
// ─────────────────────────────────────────────
describe('GET /api/subscription/verify-payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await verifyPayment(
      makeGetRequest('http://localhost/api/subscription/verify-payment?session_id=cs_test_123')
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 when session_id query param is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await verifyPayment(
      makeGetRequest('http://localhost/api/subscription/verify-payment')
    );

    expect(response.status).toBe(400);
  });

  it('returns 403 when checkout session belongs to a different user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      id: 'cs_test_abc',
      payment_status: 'paid',
      metadata: { userId: 'some-other-user-id' },
    });

    const response = await verifyPayment(
      makeGetRequest('http://localhost/api/subscription/verify-payment?session_id=cs_test_abc')
    );

    expect(response.status).toBe(403);
  });

  it('returns 402 when payment has not been completed', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      id: 'cs_test_abc',
      payment_status: 'unpaid',
      metadata: { userId: 'test-user-hirer-id' },
    });

    const response = await verifyPayment(
      makeGetRequest('http://localhost/api/subscription/verify-payment?session_id=cs_test_abc')
    );

    expect(response.status).toBe(402);
  });

  it('returns 200 with processed status when payment event is processed', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      id: 'cs_test_abc',
      payment_status: 'paid',
      metadata: { userId: 'test-user-hirer-id' },
    });

    (findProcessedPaymentEventBySessionId as jest.Mock).mockResolvedValue({
      status: 'processed',
    });

    const mockSubscription = {
      plan: { type: 'pro', status: 'active', isActive: true },
    };
    (getEntitlementStatus as jest.Mock).mockResolvedValue(mockSubscription);

    const response = await verifyPayment(
      makeGetRequest('http://localhost/api/subscription/verify-payment?session_id=cs_test_abc')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // ok() wraps data in { success: true, data: ... }
    expect(body.data.status).toBe('processed');
    expect(body.data.subscription).toBeDefined();
  });

  it('returns 200 with pending status when webhook not yet processed', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue({
      id: 'cs_test_abc',
      payment_status: 'paid',
      metadata: { userId: 'test-user-hirer-id' },
    });

    (findProcessedPaymentEventBySessionId as jest.Mock).mockResolvedValue(null);

    const response = await verifyPayment(
      makeGetRequest('http://localhost/api/subscription/verify-payment?session_id=cs_test_abc')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    // ok() wraps data in { success: true, data: ... }
    expect(body.data.status).toBe('pending');
  });
});
