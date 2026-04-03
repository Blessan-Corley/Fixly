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
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/services/emailService', () => ({
  sendContactFormEmail: jest.fn(),
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/admin-notifications', () => ({
  notifyAdmin: jest.fn(),
}));

jest.mock('@/lib/services/notifications', () => ({
  NotificationService: {
    createNotification: jest.fn(),
  },
  NOTIFICATION_TYPES: {
    ACCOUNT_UPDATE: 'account_update',
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  connectDB: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    ADMIN_NOTIFICATION_EMAIL: '',
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn(() => ({ valid: true })),
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
}));

// Mock mongoose to avoid requiring actual mongoose modules (circular deps in test env)
jest.mock('mongoose', () => ({
  models: {},
  model: jest.fn(() => ({
    create: jest.fn(),
    findOne: jest.fn(),
  })),
  Schema: jest.fn().mockImplementation(() => ({})),
  Types: { ObjectId: { isValid: jest.fn(() => true) } },
}));

import { getServerSession } from 'next-auth/next';
import type { NextRequest } from 'next/server';

import { POST as postContact } from '@/app/api/contact/route';
import { POST as postFeedback, GET as getFeedback } from '@/app/api/help/feedback/route';
import { sendContactFormEmail, sendEmail } from '@/lib/services/emailService';
import { rateLimit } from '@/utils/rateLimiting';

const makeRequest = (method: string, url: string, body?: Record<string, unknown>) =>
  new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;

const validContactBody = {
  name: 'John Doe',
  email: 'john@example.com',
  message: 'This is a test message that is long enough.',
};

const validFeedbackBody = {
  category: 'Bug Report',
  message: 'The application crashes on login.',
};

// ─── /api/contact ────────────────────────────────────────────────────────────

describe('/api/contact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (sendContactFormEmail as jest.Mock).mockResolvedValue(undefined);
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await postContact(makeRequest('POST', 'http://localhost/api/contact', validContactBody));
    expect(response.status).toBe(429);
  });

  it('returns 400 for missing required fields', async () => {
    const response = await postContact(
      makeRequest('POST', 'http://localhost/api/contact', { name: 'John' })
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for message shorter than 10 characters', async () => {
    const response = await postContact(
      makeRequest('POST', 'http://localhost/api/contact', {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Short',
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const response = await postContact(
      makeRequest('POST', 'http://localhost/api/contact', {
        name: 'John Doe',
        email: 'not-an-email',
        message: 'A valid long enough message here.',
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns 200 on valid contact form submission', async () => {
    const response = await postContact(makeRequest('POST', 'http://localhost/api/contact', validContactBody));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(sendContactFormEmail).toHaveBeenCalled();
  });

  it('returns 500 when email sending fails', async () => {
    (sendContactFormEmail as jest.Mock).mockRejectedValue(new Error('SMTP error'));

    const response = await postContact(makeRequest('POST', 'http://localhost/api/contact', validContactBody));
    expect(response.status).toBe(500);
  });

  it('still returns 200 even if confirmation email fails', async () => {
    (sendEmail as jest.Mock).mockRejectedValue(new Error('confirmation email failed'));

    const response = await postContact(makeRequest('POST', 'http://localhost/api/contact', validContactBody));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it('returns 400 for name shorter than 2 characters', async () => {
    const response = await postContact(
      makeRequest('POST', 'http://localhost/api/contact', {
        name: 'J',
        email: 'john@example.com',
        message: 'A valid long enough message here.',
      })
    );
    expect(response.status).toBe(400);
  });
});

// ─── /api/help/feedback ──────────────────────────────────────────────────────

describe('/api/help/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  it('GET returns 405 method not allowed', async () => {
    const response = await getFeedback();
    expect(response.status).toBe(405);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false, message: 'Rate limit exceeded' });

    const response = await postFeedback(
      makeRequest('POST', 'http://localhost/api/help/feedback', validFeedbackBody)
    );
    expect(response.status).toBe(429);
  });

  it('returns 400 for missing required fields', async () => {
    const response = await postFeedback(
      makeRequest('POST', 'http://localhost/api/help/feedback', { category: 'Bug' })
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for message shorter than 10 characters', async () => {
    const response = await postFeedback(
      makeRequest('POST', 'http://localhost/api/help/feedback', {
        category: 'Bug',
        message: 'Short',
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns 200 on valid feedback submission without session', async () => {
    const response = await postFeedback(
      makeRequest('POST', 'http://localhost/api/help/feedback', validFeedbackBody)
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it('sends confirmation email when user has a session email', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'user@example.com' },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const response = await postFeedback(
      makeRequest('POST', 'http://localhost/api/help/feedback', validFeedbackBody)
    );

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
  });
});
