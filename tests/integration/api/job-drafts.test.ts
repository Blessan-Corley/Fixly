jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(
        (value: string) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
      ),
    },
  },
}));

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

jest.mock('@/lib/redis', () => ({
  redisRateLimit: jest.fn(),
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/cloudinary', () => ({
  __esModule: true,
  default: {
    uploader: {
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

jest.mock('@/lib/validations/content-policy', () => ({
  moderateUserGeneratedContent: jest.fn().mockResolvedValue({ allowed: true }),
}));

// JobDraft mock — self-contained factory to avoid hoisting issues with const variables.
jest.mock('@/models/JobDraft', () => {
  const MockJobDraftCtor = jest.fn().mockImplementation(() => ({
    _id: '507f1f77bcf86cd799439022',
    title: 'Fix my roof',
    description: 'Leaking in three spots',
    completionPercentage: 50,
    currentStep: 2,
    draftStatus: 'auto_saved',
    lastActivity: new Date(),
    lastAutoSave: new Date(),
    lastManualSave: null,
    ageInHours: 1,
    hoursUntilExpiry: 71,
    isExpired: false,
    photoCount: 0,
    videoCount: 0,
    convertedToJob: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    attachments: [],
    addManualSave: jest.fn().mockResolvedValue(undefined),
    addAutoSave: jest.fn().mockResolvedValue(undefined),
    updateActivity: jest.fn().mockResolvedValue(undefined),
  }));
  Object.assign(MockJobDraftCtor, {
    find: jest.fn(),
    findOne: jest.fn(),
    findUserDrafts: jest.fn(),
    findByIdAndDelete: jest.fn(),
  });
  return { __esModule: true, default: MockJobDraftCtor };
});

import { getServerSession } from 'next-auth/next';

import { DELETE, GET, POST } from '@/app/api/jobs/drafts/route';
import { redisRateLimit } from '@/lib/redis';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import JobDraft from '@/models/JobDraft';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';

describe('/api/jobs/drafts', () => {
  const userId = '507f1f77bcf86cd799439011';
  const draftId = '507f1f77bcf86cd799439022';

  const makeDraftDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: draftId,
    title: 'Fix my roof',
    description: 'Leaking in three spots',
    completionPercentage: 50,
    currentStep: 2,
    draftStatus: 'auto_saved',
    lastActivity: new Date(),
    lastAutoSave: new Date(),
    lastManualSave: null,
    ageInHours: 1,
    hoursUntilExpiry: 71,
    isExpired: false,
    photoCount: 0,
    videoCount: 0,
    convertedToJob: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    attachments: [],
    addManualSave: jest.fn().mockResolvedValue(undefined),
    addAutoSave: jest.fn().mockResolvedValue(undefined),
    updateActivity: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset constructor mock to return a default draft document
    (JobDraft as unknown as jest.Mock).mockImplementation(() => makeDraftDoc());
    (redisRateLimit as jest.Mock).mockResolvedValue({
      success: true,
      remaining: 59,
      resetTime: Date.now() + 3_600_000,
    });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: userId,
        email: 'test-hirer@example.com',
        role: 'hirer',
        csrfToken: TEST_CSRF_TOKEN,
      },
    });
    (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({ allowed: true });
  });

  // ─── GET ────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/jobs/drafts', { method: 'GET' })
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBe('Authentication required');
    });

    it('returns paginated drafts for authenticated user', async () => {
      const draft = makeDraftDoc();
      (JobDraft.findUserDrafts as jest.Mock).mockResolvedValue([draft]);

      const response = await GET(
        new Request('http://localhost/api/jobs/drafts?limit=10', { method: 'GET' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(Array.isArray(payload.drafts)).toBe(true);
      expect(payload.drafts).toHaveLength(1);
      expect(payload.drafts[0]._id).toBe(draftId);
    });

    it('includes converted drafts when includeConverted=true', async () => {
      const draft = makeDraftDoc({ convertedToJob: true });
      (JobDraft.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([draft]),
      });

      const response = await GET(
        new Request('http://localhost/api/jobs/drafts?includeConverted=true', { method: 'GET' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.drafts[0].convertedToJob).toBe(true);
    });

    it('returns empty array when user has no drafts', async () => {
      (JobDraft.findUserDrafts as jest.Mock).mockResolvedValue([]);

      const response = await GET(
        new Request('http://localhost/api/jobs/drafts', { method: 'GET' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.drafts).toHaveLength(0);
    });
  });

  // ─── POST ───────────────────────────────────────────────────────────────────

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          body: JSON.stringify({ formData: { title: 'Fix roof' }, currentStep: 1 }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBe('Authentication required');
    });

    it('returns 429 when rate limited', async () => {
      (redisRateLimit as jest.Mock).mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 3_600_000,
      });

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ formData: { title: 'Fix roof' }, currentStep: 1 }),
        })
      );

      expect(response.status).toBe(429);
    });

    it('returns 403 when CSRF token does not match session token', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: userId,
          email: 'test-hirer@example.com',
          role: 'hirer',
          csrfToken: 'session-token-that-will-not-match-request-header',
        },
      });

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': 'completely-different-wrong-csrf-token' },
          body: JSON.stringify({ formData: { title: 'Fix roof' }, currentStep: 1 }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('creates a new draft with valid data (auto save)', async () => {
      const draft = makeDraftDoc();
      (JobDraft as unknown as jest.Mock).mockImplementation(() => draft);

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            formData: { title: 'Fix roof', description: 'Leaking badly needs repair asap' },
            currentStep: 1,
            saveType: 'auto',
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.draft).toBeDefined();
    });

    it('creates a new draft with manual save type', async () => {
      const draft = makeDraftDoc({ draftStatus: 'manually_saved' });
      (JobDraft as unknown as jest.Mock).mockImplementation(() => draft);

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            formData: { title: 'Fix roof', description: 'Leaking badly needs repair asap' },
            currentStep: 1,
            saveType: 'manual',
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(draft.addManualSave).toHaveBeenCalled();
    });

    it('returns 400 when content fails moderation', async () => {
      (moderateUserGeneratedContent as jest.Mock).mockResolvedValue({
        allowed: false,
        message: 'Content contains profanity',
        violations: [{ type: 'profanity', severity: 'high', text: 'badword' }],
        suggestions: ['Please remove inappropriate language'],
      });

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            formData: { title: 'Fix roof', description: 'This has badword content' },
            currentStep: 1,
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.success).toBe(false);
    });

    it('returns 400 for invalid draftId format', async () => {
      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            draftId: 'not-a-valid-object-id',
            formData: { title: 'Fix roof' },
            currentStep: 1,
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toMatch(/invalid draft/i);
    });

    it('updates existing draft when valid draftId is provided', async () => {
      const draft = makeDraftDoc();
      (JobDraft.findOne as jest.Mock).mockResolvedValue(draft);

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            draftId,
            formData: { title: 'Fix roof updated', description: 'Leaking badly needs repair asap' },
            currentStep: 2,
            saveType: 'manual',
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
    });

    it('returns 404 when trying to update a draft that does not exist', async () => {
      (JobDraft.findOne as jest.Mock).mockResolvedValue(null);

      const response = await POST(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            draftId,
            formData: { title: 'Fix roof', description: 'Some description here' },
            currentStep: 1,
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(404);
      expect(payload.success).toBe(false);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────────

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/drafts?draftId=${draftId}`, { method: 'DELETE' })
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBe('Authentication required');
    });

    it('returns 403 when CSRF token does not match session token', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: userId,
          email: 'test-hirer@example.com',
          role: 'hirer',
          csrfToken: 'session-token-that-will-not-match-request-header',
        },
      });

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/drafts?draftId=${draftId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': 'completely-different-wrong-csrf-token' },
        })
      );

      expect(response.status).toBe(403);
    });

    it('returns 400 when draftId is missing', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/jobs/drafts', {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toMatch(/draft id/i);
    });

    it('returns 400 when draftId format is invalid', async () => {
      const response = await DELETE(
        new Request('http://localhost/api/jobs/drafts?draftId=not-valid-id', {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
    });

    it('returns 404 when draft does not exist', async () => {
      (JobDraft.findOne as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/drafts?draftId=${draftId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(404);
      expect(payload.success).toBe(false);
    });

    it('deletes draft successfully and removes cloudinary attachments', async () => {
      const { default: cloudinary } = await import('@/lib/cloudinary');
      const draft = makeDraftDoc({
        attachments: [
          {
            publicId: 'fixly/draft/photo123',
            url: 'https://cdn.example.com/img.jpg',
            type: 'image',
          },
        ],
      });
      (JobDraft.findOne as jest.Mock).mockResolvedValue(draft);
      (JobDraft.findByIdAndDelete as jest.Mock).mockResolvedValue(draft);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/drafts?draftId=${draftId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        })
      );

      expect(response.status).toBe(204);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('fixly/draft/photo123', {
        resource_type: 'auto',
      });
      expect(JobDraft.findByIdAndDelete).toHaveBeenCalledWith(draftId);
    });

    it('deletes draft without attachments successfully', async () => {
      const draft = makeDraftDoc({ attachments: [] });
      (JobDraft.findOne as jest.Mock).mockResolvedValue(draft);
      (JobDraft.findByIdAndDelete as jest.Mock).mockResolvedValue(draft);

      const response = await DELETE(
        new Request(`http://localhost/api/jobs/drafts?draftId=${draftId}`, {
          method: 'DELETE',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
        })
      );

      expect(response.status).toBe(204);
    });
  });
});
