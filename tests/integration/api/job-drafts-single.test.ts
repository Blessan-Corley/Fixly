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
  env: { NODE_ENV: 'test' },
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn(() => ({ valid: true })),
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
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

jest.mock('@/models/JobDraft', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { GET } from '@/app/api/jobs/drafts/[draftId]/route';
import JobDraft from '@/models/JobDraft';
import { createTestSession } from '@/tests/helpers/auth';

const DRAFT_ID = '507f1f77bcf86cd799439022';
const INVALID_ID = 'not-a-valid-object-id';

function makeGetRequest(draftId = DRAFT_ID): Request {
  return new Request(`http://localhost/api/jobs/drafts/${draftId}`, {
    method: 'GET',
  });
}

describe('/api/jobs/drafts/[draftId] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(makeGetRequest(), { params: Promise.resolve({ draftId: DRAFT_ID }) });

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid ObjectId format', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await GET(makeGetRequest(INVALID_ID), { params: Promise.resolve({ draftId: INVALID_ID }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain('Invalid draft ID');
  });

  it('returns 404 when draft does not exist or belongs to another user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (JobDraft.findOne as jest.Mock).mockResolvedValue(null);

    const response = await GET(makeGetRequest(), { params: Promise.resolve({ draftId: DRAFT_ID }) });

    expect(response.status).toBe(404);
  });

  it('returns 200 with draft details for the owner', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const now = new Date();
    const mockDraft = {
      _id: DRAFT_ID,
      title: 'Fix my roof',
      description: 'It is leaking badly',
      skillsRequired: ['roofing', 'waterproofing'],
      budget: { type: 'fixed', amount: 500 },
      location: { city: 'Mumbai', coordinates: [72.87, 19.07] },
      deadline: now,
      scheduledDate: null,
      urgency: 'high',
      attachments: [],
      currentStep: 2,
      completedSteps: [{ step: 1, completedAt: now }],
      draftStatus: 'auto_saved',
      completionPercentage: 50,
      validationStatus: {},
      lastActivity: now,
      lastAutoSave: now,
      lastManualSave: null,
      ageInHours: 2,
      hoursUntilExpiry: 46,
      isExpired: false,
      photoCount: 0,
      videoCount: 0,
      createdAt: now,
      updatedAt: now,
      updateActivity: jest.fn().mockResolvedValue(undefined),
    };

    (JobDraft.findOne as jest.Mock).mockResolvedValue(mockDraft);

    const response = await GET(makeGetRequest(), { params: Promise.resolve({ draftId: DRAFT_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.draft.title).toBe('Fix my roof');
    expect(body.draft.draftStatus).toBe('auto_saved');
    expect(body.draft.completionPercentage).toBe(50);
    expect(mockDraft.updateActivity).toHaveBeenCalledTimes(1);
  });

  it('returns 410 when draft has expired', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockExpiredDraft = {
      _id: DRAFT_ID,
      title: 'Old draft',
      isExpired: true,
      updateActivity: jest.fn(),
    };

    (JobDraft.findOne as jest.Mock).mockResolvedValue(mockExpiredDraft);

    const response = await GET(makeGetRequest(), { params: Promise.resolve({ draftId: DRAFT_ID }) });
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.success).toBe(false);
    expect(body.message).toContain('expired');
  });

  it('only fetches drafts belonging to the authenticated user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (JobDraft.findOne as jest.Mock).mockResolvedValue(null);

    await GET(makeGetRequest(), { params: Promise.resolve({ draftId: DRAFT_ID }) });

    expect(JobDraft.findOne).toHaveBeenCalledWith({
      _id: DRAFT_ID,
      createdBy: 'test-user-hirer-id',
    });
  });

  it('returns 500 when an unexpected database error occurs', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (JobDraft.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await GET(makeGetRequest(), { params: Promise.resolve({ draftId: DRAFT_ID }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
