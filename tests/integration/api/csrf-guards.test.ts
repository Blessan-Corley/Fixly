// Phase 2: Updated CSRF integration coverage for per-session tokens.
import type { NextRequest } from 'next/server';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(
        (value: string) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
      ),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/Conversation', () => ({
  __esModule: true,
  default: {
    findOrCreateBetween: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/services/messageService', () => ({
  MessageService: {
    sendMessage: jest.fn(),
    getConversation: jest.fn(),
    markAsRead: jest.fn(),
    getJobConversation: jest.fn(),
    getUserConversations: jest.fn(),
    updateMessage: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/billing/paymentEventService', () => ({
  recordPaymentEvent: jest.fn(),
  markEventProcessed: jest.fn(),
  markEventFailed: jest.fn(),
}));

jest.mock('@/lib/services/billing/entitlementService', () => ({
  grantSubscriptionEntitlement: jest.fn(),
  revokeSubscriptionEntitlement: jest.fn(),
}));

import { getServerSession } from 'next-auth/next';

import { POST as postMessages } from '@/app/api/messages/route';
import { POST as postStripeWebhook } from '@/app/api/stripe/webhook/route';
import { csrfGuard } from '@/lib/security/csrf';
import { rateLimit } from '@/utils/rateLimiting';

describe('CSRF guards', () => {
  const userId = '507f1f77bcf86cd799439011';
  const csrfToken = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 403 for POST /api/messages without csrf token', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: userId, csrfToken },
    });

    const response = await postMessages(
      new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('CSRF_INVALID');
  });

  it('allows POST /api/messages with valid csrf token to proceed past CSRF guard', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: userId, csrfToken },
    });

    const response = await postMessages(
      new Request('http://localhost/api/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({}),
      })
    );

    expect(response.status).not.toBe(403);
  });

  it('does not apply CSRF blocking to POST /api/stripe/webhook', async () => {
    const webhookRequest = {
      method: 'POST',
      url: 'http://localhost/api/stripe/webhook',
      headers: new Headers({
        'content-type': 'application/json',
      }),
      text: jest.fn(async () => '{}'),
    } as unknown as Request;

    const response = await postStripeWebhook(webhookRequest as unknown as NextRequest);

    expect(response.status).not.toBe(403);
  });

  it('never blocks GET requests through csrfGuard', () => {
    const result = csrfGuard(
      new Request('http://localhost/api/messages', { method: 'GET' }),
      {
        user: {
          csrfToken,
        },
      }
    );
    expect(result).toBeNull();
  });
});
