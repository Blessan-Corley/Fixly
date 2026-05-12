/**
 * Unit tests for lib/services/webPushServer.ts
 *
 * Covers:
 *   - isValidStoredPushSubscription type guard
 *   - sendWebPushMessage with VAPID keys missing
 *   - sendWebPushMessage with valid VAPID keys (success path)
 *   - sendWebPushMessage with 404 / 410 gone-subscription errors
 *   - sendWebPushMessage with unexpected errors
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock web-push before any import of the module under test
// ---------------------------------------------------------------------------
const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/env so we control VAPID keys per test
// ---------------------------------------------------------------------------
const mockEnv = {
  WEB_PUSH_VAPID_PUBLIC_KEY: 'test-vapid-public-key',
  WEB_PUSH_VAPID_PRIVATE_KEY: 'test-vapid-private-key',
  WEB_PUSH_CONTACT_EMAIL: 'mailto:test@fixly.app',
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: undefined as string | undefined,
};

vi.mock('@/lib/env', () => ({ env: mockEnv }));

// ---------------------------------------------------------------------------
// Mock logger to keep test output clean
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const validSubscription = {
  endpoint: 'https://push.example.test/unique-subscription-id',
  keys: { auth: 'auth-token-abc', p256dh: 'p256dh-token-xyz' },
  expirationTime: null,
};

// We re-import the module after mocks so each describe block can reset state
// using vi.resetModules() to clear the module-level `vapidInitialized` flag.

describe('isValidStoredPushSubscription', () => {
  it('accepts a valid subscription object', async () => {
    const { isValidStoredPushSubscription } = await import(
      '@/lib/services/webPushServer'
    );
    expect(isValidStoredPushSubscription(validSubscription)).toBe(true);
  });

  it('rejects null / undefined', async () => {
    const { isValidStoredPushSubscription } = await import(
      '@/lib/services/webPushServer'
    );
    expect(isValidStoredPushSubscription(null)).toBe(false);
    expect(isValidStoredPushSubscription(undefined)).toBe(false);
  });

  it('rejects an object with missing endpoint', async () => {
    const { isValidStoredPushSubscription } = await import(
      '@/lib/services/webPushServer'
    );
    expect(
      isValidStoredPushSubscription({ keys: { auth: 'a', p256dh: 'b' } })
    ).toBe(false);
  });

  it('rejects an object with an empty endpoint', async () => {
    const { isValidStoredPushSubscription } = await import(
      '@/lib/services/webPushServer'
    );
    expect(
      isValidStoredPushSubscription({
        endpoint: '   ',
        keys: { auth: 'a', p256dh: 'b' },
      })
    ).toBe(false);
  });

  it('rejects an object with missing keys.auth', async () => {
    const { isValidStoredPushSubscription } = await import(
      '@/lib/services/webPushServer'
    );
    expect(
      isValidStoredPushSubscription({
        endpoint: 'https://example.com',
        keys: { p256dh: 'b' },
      })
    ).toBe(false);
  });

  it('rejects an object with missing keys.p256dh', async () => {
    const { isValidStoredPushSubscription } = await import(
      '@/lib/services/webPushServer'
    );
    expect(
      isValidStoredPushSubscription({
        endpoint: 'https://example.com',
        keys: { auth: 'a' },
      })
    ).toBe(false);
  });

  it('rejects a plain string', async () => {
    const { isValidStoredPushSubscription } = await import(
      '@/lib/services/webPushServer'
    );
    expect(isValidStoredPushSubscription('https://example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sendWebPushMessage — reset module state between describe blocks so the
// module-level `vapidInitialized` flag is re-evaluated each time.
// ---------------------------------------------------------------------------

describe('sendWebPushMessage — VAPID keys missing', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSetVapidDetails.mockReset();
    mockSendNotification.mockReset();
    // Unset both keys
    mockEnv.WEB_PUSH_VAPID_PUBLIC_KEY = '';
    mockEnv.WEB_PUSH_VAPID_PRIVATE_KEY = '';
    mockEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY = undefined;
  });

  afterEach(() => {
    // Restore for subsequent describe blocks
    mockEnv.WEB_PUSH_VAPID_PUBLIC_KEY = 'test-vapid-public-key';
    mockEnv.WEB_PUSH_VAPID_PRIVATE_KEY = 'test-vapid-private-key';
  });

  it('returns false without calling sendNotification', async () => {
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');
    const result = await sendWebPushMessage(validSubscription, {
      title: 'Test',
      body: 'Hello',
    });
    expect(result).toBe(false);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

describe('sendWebPushMessage — VAPID configured', () => {
  beforeEach(() => {
    vi.resetModules();
    mockSetVapidDetails.mockReset();
    mockSendNotification.mockReset();
    mockEnv.WEB_PUSH_VAPID_PUBLIC_KEY = 'test-vapid-public-key';
    mockEnv.WEB_PUSH_VAPID_PRIVATE_KEY = 'test-vapid-private-key';
  });

  it('calls setVapidDetails on first send and returns true on success', async () => {
    mockSendNotification.mockResolvedValue(undefined);
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');

    const result = await sendWebPushMessage(validSubscription, {
      title: 'New Job',
      body: 'A new job was posted near you.',
      url: '/dashboard/browse-jobs',
    });

    expect(result).toBe(true);
    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      'mailto:test@fixly.app',
      'test-vapid-public-key',
      'test-vapid-private-key'
    );
    expect(mockSendNotification).toHaveBeenCalledWith(
      validSubscription,
      expect.stringContaining('"title":"New Job"'),
      expect.objectContaining({ TTL: expect.any(Number) })
    );
  });

  it('uses urgency=high and TTL=60 for urgent payloads', async () => {
    mockSendNotification.mockResolvedValue(undefined);
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');

    await sendWebPushMessage(validSubscription, {
      title: 'Urgent!',
      body: 'Action required.',
      urgent: true,
    });

    expect(mockSendNotification).toHaveBeenCalledWith(
      validSubscription,
      expect.any(String),
      expect.objectContaining({ urgency: 'high', TTL: 60 })
    );
  });

  it('uses urgency=normal and TTL=3600 for regular payloads', async () => {
    mockSendNotification.mockResolvedValue(undefined);
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');

    await sendWebPushMessage(validSubscription, {
      title: 'Info',
      body: 'Something happened.',
    });

    expect(mockSendNotification).toHaveBeenCalledWith(
      validSubscription,
      expect.any(String),
      expect.objectContaining({ urgency: 'normal', TTL: 3600 })
    );
  });

  it('serialises tag and data into the push body', async () => {
    mockSendNotification.mockResolvedValue(undefined);
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');

    await sendWebPushMessage(validSubscription, {
      title: 'Tagged',
      body: 'With extra data.',
      tag: 'job-alert',
      data: { jobId: '123' },
    });

    const [, bodyArg] = mockSendNotification.mock.calls[0] as [unknown, string, unknown];
    const parsed = JSON.parse(bodyArg) as {
      tag: string;
      data: { jobId: string };
    };
    expect(parsed.tag).toBe('job-alert');
    expect(parsed.data.jobId).toBe('123');
  });

  it('returns false when subscription is gone (404)', async () => {
    mockSendNotification.mockRejectedValue({ statusCode: 404 });
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');

    const result = await sendWebPushMessage(validSubscription, {
      title: 'Gone',
      body: 'Subscription expired.',
    });

    expect(result).toBe(false);
  });

  it('returns false when subscription is gone (410)', async () => {
    mockSendNotification.mockRejectedValue({ statusCode: 410 });
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');

    const result = await sendWebPushMessage(validSubscription, {
      title: 'Gone',
      body: 'Subscription unregistered.',
    });

    expect(result).toBe(false);
  });

  it('returns false and logs on unexpected errors', async () => {
    mockSendNotification.mockRejectedValue(new Error('Network failure'));
    const { sendWebPushMessage } = await import('@/lib/services/webPushServer');
    const { logger } = await import('@/lib/logger');

    const result = await sendWebPushMessage(validSubscription, {
      title: 'Fail',
      body: 'Something went wrong.',
    });

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });
});
