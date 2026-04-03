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

jest.mock('@/models/Dispute', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/disputes/state', () => ({
  applyRespondentDisputeResponse: jest.fn(),
  syncJobDisputeState: jest.fn(),
}));

jest.mock('@/lib/validations/content-policy', () => ({
  moderateUserGeneratedContent: jest.fn(),
}));

jest.mock('@/lib/services/notifications', () => ({
  NOTIFICATION_TYPES: { DISPUTE: 'dispute' },
  NotificationService: {
    createNotification: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock authorization so requirePermission doesn't throw and can() returns
// sensible defaults — tests that need specific can() behavior override below.
jest.mock('@/lib/authorization', () => ({
  can: jest.fn().mockReturnValue(false),
  requirePermission: jest.fn(), // no-op by default — does not throw
}));

// Mock CSRF server so server-only doesn't cause issues and CSRF always passes
// unless overridden per test.
jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn().mockReturnValue({ valid: true }),
  generateCsrfToken: jest.fn().mockReturnValue('test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn().mockReturnValue('test-csrf-token-for-integration-tests'),
}));

import { getServerSession } from 'next-auth/next';

import { GET, PUT } from '@/app/api/disputes/[disputeId]/route';
import { can, requirePermission } from '@/lib/authorization';
import { applyRespondentDisputeResponse, syncJobDisputeState } from '@/lib/disputes/state';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Dispute from '@/models/Dispute';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF = 'test-csrf-token-for-integration-tests';
const HIRER_ID = '507f1f77bcf86cd799439011';
const FIXER_ID = '507f1f77bcf86cd799439022';
const ADMIN_ID = '507f1f77bcf86cd799439033';
const DISPUTE_ID = 'DSP-001';

function createTestSession(
  userId: string,
  role: 'hirer' | 'fixer' | 'admin' = 'hirer'
) {
  return {
    user: { id: userId, email: 'test@example.com', role, csrfToken: TEST_CSRF },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeRequest(
  method: string,
  body?: unknown,
  csrfToken = TEST_CSRF
): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  return new Request(`http://localhost/api/disputes/${DISPUTE_ID}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function mockDispute(overrides: Record<string, unknown> = {}) {
  return {
    disputeId: DISPUTE_ID,
    initiatedBy: HIRER_ID,
    againstUser: FIXER_ID,
    assignedModerator: null,
    status: 'open',
    job: '507f1f77bcf86cd799439044',
    messages: [],
    timeline: [],
    metadata: { viewedBy: [] },
    response: null,
    toObject: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(undefined),
    addMessage: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Returns a chainable mock for Dispute.findOne that resolves to `resolvedValue`.
 * The GET handler chains multiple .populate() calls before awaiting.
 */
function makeChainableQuery(resolvedValue: unknown) {
  const query: Record<string, unknown> = {};
  const populate = jest.fn().mockReturnValue(query);
  query.populate = populate;
  // Make the query thenable so `await query` resolves to `resolvedValue`
  query.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(resolvedValue).then(resolve, reject);
  query.catch = (reject: (e: unknown) => unknown) => Promise.resolve(resolvedValue).catch(reject);
  return query;
}

describe('/api/disputes/[disputeId] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (Dispute.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
    // By default, can() returns false (non-admin); requirePermission is a no-op
    (can as jest.Mock).mockReturnValue(false);
    (requirePermission as jest.Mock).mockImplementation(() => undefined);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    expect(response.status).toBe(429);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    expect(response.status).toBe(401);
  });

  it('returns 404 when dispute does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(HIRER_ID, 'hirer'));
    (Dispute.findOne as jest.Mock).mockReturnValue(makeChainableQuery(null));

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    expect(response.status).toBe(404);
  });

  it('returns 403 when user is not a participant', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(
      createTestSession('unrelated-user-id', 'hirer')
    );
    const dispute = mockDispute();
    (Dispute.findOne as jest.Mock).mockReturnValue(makeChainableQuery(dispute));
    // can() returns false → not a moderator; initiatedBy/againstUser don't match → canAccessDispute = false
    (can as jest.Mock).mockReturnValue(false);

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    expect(response.status).toBe(403);
  });

  it('returns 200 for the initiating hirer', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(HIRER_ID, 'hirer'));
    const dispute = mockDispute();
    (Dispute.findOne as jest.Mock).mockReturnValue(makeChainableQuery(dispute));

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.dispute).toBeDefined();
  });

  it('returns 200 for the respondent fixer', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));
    const dispute = mockDispute();
    (Dispute.findOne as jest.Mock).mockReturnValue(makeChainableQuery(dispute));

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    expect(response.status).toBe(200);
  });

  it('returns 200 for admin (moderator access)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(ADMIN_ID, 'admin'));
    const dispute = mockDispute();
    (Dispute.findOne as jest.Mock).mockReturnValue(makeChainableQuery(dispute));
    // Admin can moderate disputes → canAccessDispute returns true via can()
    (can as jest.Mock).mockImplementation((_user, action) =>
      action === 'moderate' ? true : false
    );

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    expect(response.status).toBe(200);
  });

  it('filters non-public messages for non-admin users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(HIRER_ID, 'hirer'));
    const privateMessage = { content: 'Private note', isPublic: false, sender: ADMIN_ID };
    const publicMessage = { content: 'Public message', isPublic: true, sender: HIRER_ID };
    const dispute = mockDispute({
      messages: [privateMessage, publicMessage],
      toObject: jest.fn().mockReturnValue({
        disputeId: DISPUTE_ID,
        initiatedBy: HIRER_ID,
        againstUser: FIXER_ID,
        messages: [privateMessage, publicMessage],
      }),
    });
    (Dispute.findOne as jest.Mock).mockReturnValue(makeChainableQuery(dispute));
    // Non-admin: can('moderate') returns false → messages get filtered
    (can as jest.Mock).mockReturnValue(false);

    const response = await GET(makeRequest('GET'), { params: Promise.resolve({ disputeId: DISPUTE_ID }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.dispute.messages).toHaveLength(1);
    expect(body.dispute.messages[0].isPublic).toBe(true);
  });
});

describe('/api/disputes/[disputeId] PUT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({ allowed: true });
    // requirePermission is a no-op by default (does not throw)
    (requirePermission as jest.Mock).mockImplementation(() => undefined);
    (can as jest.Mock).mockReturnValue(false);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));

    const response = await PUT(
      makeRequest('PUT', {
        content: 'Response content',
        acknowledgement: 'acknowledge',
      }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(429);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await PUT(
      makeRequest('PUT', { content: 'Response', acknowledgement: 'acknowledge' }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 403 when CSRF token is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));
    // Override validateCsrfToken to simulate CSRF failure for empty token
    const { validateCsrfToken } = require('@/lib/security/csrf.server');
    (validateCsrfToken as jest.Mock).mockReturnValueOnce({
      valid: false,
      reason: 'MISSING_HEADER_TOKEN',
    });

    const response = await PUT(
      makeRequest('PUT', { content: 'Response', acknowledgement: 'acknowledge' }, ''),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(403);
  });

  it('returns 400 when content is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));

    const response = await PUT(
      makeRequest('PUT', { acknowledgement: 'acknowledge' }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 when acknowledgement is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));

    const response = await PUT(
      makeRequest('PUT', { content: 'Response content' }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when dispute does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));
    (Dispute.findOne as jest.Mock).mockResolvedValue(null);

    const response = await PUT(
      makeRequest('PUT', { content: 'My response', acknowledgement: 'acknowledge' }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 when user is not the respondent', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(HIRER_ID, 'hirer'));
    const dispute = mockDispute({ response: null });
    (Dispute.findOne as jest.Mock).mockResolvedValue(dispute);

    const response = await PUT(
      makeRequest('PUT', { content: 'My response', acknowledgement: 'acknowledge' }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toContain('respondent');
  });

  it('returns 400 when response has already been submitted', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));
    const dispute = mockDispute({
      response: { respondedBy: FIXER_ID, content: 'Already responded' },
    });
    (Dispute.findOne as jest.Mock).mockResolvedValue(dispute);

    const response = await PUT(
      makeRequest('PUT', { content: 'Another response', acknowledgement: 'acknowledge' }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('already submitted');
  });

  it('returns 200 when respondent submits a valid response', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession(FIXER_ID, 'fixer'));
    const dispute = mockDispute({ response: null });
    (Dispute.findOne as jest.Mock).mockResolvedValue(dispute);
    (applyRespondentDisputeResponse as jest.Mock).mockReturnValue({ resolved: false });
    (syncJobDisputeState as jest.Mock).mockResolvedValue(undefined);

    const response = await PUT(
      makeRequest('PUT', { content: 'My response to the dispute', acknowledgement: 'dispute' }),
      { params: Promise.resolve({ disputeId: DISPUTE_ID }) }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Response submitted successfully');
    expect(dispute.save).toHaveBeenCalled();
  });
});
