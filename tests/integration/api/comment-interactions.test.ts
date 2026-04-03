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

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/ably', () => ({
  getServerAbly: jest.fn().mockReturnValue(null),
  CHANNELS: {
    jobComments: jest.fn((id: string) => `job-comments:${id}`),
  },
  EVENTS: {
    COMMENT_LIKED: 'comment-liked',
    COMMENT_REACTED: 'comment-reacted',
  },
}));

jest.mock('@/lib/redisCache', () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/notifications', () => ({
  sendTemplatedNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/api/auth', () => {
  const { NextResponse } = require('next/server');
  return {
    requireSession: jest.fn(),
    getOptionalSession: jest.fn(),
  };
});

jest.mock('@/lib/api/parse', () => ({
  parseBody: jest.fn(),
}));

jest.mock('@/lib/api/response', () => {
  const { NextResponse } = require('next/server');
  return {
    badRequest: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 400 })
    ),
    notFound: jest.fn((entity: string) =>
      NextResponse.json({ message: `${entity} not found` }, { status: 404 })
    ),
    respond: jest.fn((data: unknown, status = 200) => NextResponse.json(data, { status })),
    tooManyRequests: jest.fn((msg: string) =>
      NextResponse.json({ message: msg }, { status: 429 })
    ),
    unauthorized: jest.fn(() =>
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    ),
  };
});

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  env: { NODE_ENV: 'test' },
}));

import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import {
  GET as getCommentLikes,
  POST as postCommentLike,
} from '@/app/api/jobs/[jobId]/comments/[commentId]/like/route';
import {
  GET as getCommentReactions,
  POST as postCommentReaction,
} from '@/app/api/jobs/[jobId]/comments/[commentId]/react/route';
import { requireSession, getOptionalSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF_TOKEN = 'test-csrf-token-for-integration-tests';
const JOB_ID = '507f1f77bcf86cd799439011';
const COMMENT_ID = '507f1f77bcf86cd799439022';
const USER_ID = 'test-user-hirer-id';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: {
      id: USER_ID,
      email: `test@example.com`,
      role,
      name: `Test ${role}`,
      csrfToken: TEST_CSRF_TOKEN,
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function sessionWithMismatchedCsrf() {
  return {
    user: {
      id: USER_ID,
      email: 'test@example.com',
      role: 'hirer',
      csrfToken: 'a'.repeat(64),
    },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

// ── POST /api/jobs/[jobId]/comments/[commentId]/like ──────────────────────────

describe('POST /api/jobs/[jobId]/comments/[commentId]/like', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession() });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    (requireSession as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await postCommentLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await postCommentLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(429);
  });

  it('returns 403 when user is banned', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: USER_ID, name: 'Test', banned: true });
    (Job.findById as jest.Mock).mockResolvedValue({
      _id: JOB_ID,
      title: 'Test Job',
    });

    const response = await postCommentLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.message).toMatch(/suspended/i);
  });

  it('returns 404 when user not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);

    const response = await postCommentLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 404 when job not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: USER_ID, name: 'Test', banned: false });
    (Job.findById as jest.Mock).mockResolvedValue(null);

    const response = await postCommentLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 404 when comment not found on job', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: USER_ID, name: 'Test', banned: false });
    const mockJob = {
      _id: JOB_ID,
      comments: {
        id: jest.fn().mockReturnValue(null),
      },
      toggleCommentLike: jest.fn().mockReturnValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValue(mockJob);

    const response = await postCommentLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 on successful comment like toggle', async () => {
    const mockUser = { _id: USER_ID, name: 'Test User', banned: false };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const mockComment = {
      _id: COMMENT_ID,
      author: 'other-user-id',
      likes: [],
    };
    const mockJob = {
      _id: JOB_ID,
      comments: {
        id: jest.fn().mockReturnValue(mockComment),
      },
      toggleCommentLike: jest.fn().mockReturnValue({ liked: true, likeCount: 1 }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValue(mockJob);

    const response = await postCommentLike(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.liked).toBe(true);
    expect(payload.likeCount).toBe(1);
  });
});

// ── GET /api/jobs/[jobId]/comments/[commentId]/like ───────────────────────────

describe('GET /api/jobs/[jobId]/comments/[commentId]/like', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getOptionalSession as jest.Mock).mockResolvedValue(null);
  });

  it('returns 404 when job not found', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    const response = await getCommentLikes(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 with like count for comment', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: JOB_ID,
        comments: [
          {
            _id: COMMENT_ID,
            likes: [{ user: 'user-1' }, { user: 'user-2' }],
            replies: [],
          },
        ],
      }),
    });

    const response = await getCommentLikes(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/like`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.likeCount).toBe(2);
    expect(payload.liked).toBe(false);
  });
});

// ── POST /api/jobs/[jobId]/comments/[commentId]/react ─────────────────────────

describe('POST /api/jobs/[jobId]/comments/[commentId]/react', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession() });
    (csrfGuard as jest.Mock).mockReturnValue(null);
    (parseBody as jest.Mock).mockResolvedValue({
      data: { reactionType: 'heart' },
    });
  });

  it('returns 401 when no session', async () => {
    const mockAuthError = new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401 }
    );
    (requireSession as jest.Mock).mockResolvedValue({ error: mockAuthError });

    const response = await postCommentReaction(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`, {
        reactionType: 'heart',
      }),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it('returns 400 when invalid reaction type', async () => {
    (parseBody as jest.Mock).mockResolvedValue({
      data: { reactionType: 'invalid_reaction' },
    });

    const response = await postCommentReaction(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`, {
        reactionType: 'invalid_reaction',
      }),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message ?? payload.error).toMatch(/reaction/i);
  });

  it('returns 403 when user is banned', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: USER_ID, name: 'Test', banned: true });
    (Job.findById as jest.Mock).mockResolvedValue({ _id: JOB_ID });

    const response = await postCommentReaction(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`, {
        reactionType: 'heart',
      }),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(403);
  });

  it('returns 404 when comment not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue({ _id: USER_ID, name: 'Test', banned: false });
    const mockJob = {
      _id: JOB_ID,
      comments: {
        id: jest.fn().mockReturnValue(null),
      },
      toggleCommentReaction: jest.fn().mockReturnValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValue(mockJob);

    const response = await postCommentReaction(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`, {
        reactionType: 'heart',
      }),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 on successful reaction', async () => {
    const mockUser = { _id: USER_ID, name: 'Test User', banned: false };
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const mockComment = {
      _id: COMMENT_ID,
      author: 'other-user-id',
      reactions: [],
    };
    const mockJob = {
      _id: JOB_ID,
      comments: {
        id: jest.fn().mockReturnValue(mockComment),
      },
      toggleCommentReaction: jest.fn().mockReturnValue({
        reacted: true,
        reactionType: 'heart',
        count: 1,
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Job.findById as jest.Mock).mockResolvedValue(mockJob);

    const response = await postCommentReaction(
      makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`, {
        reactionType: 'heart',
      }),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.reacted).toBe(true);
    expect(payload.reactionType).toBe('heart');
  });

  it('returns 200 when toggling all allowed reaction types', async () => {
    const allowedReactions = ['thumbs_up', 'thumbs_down', 'heart', 'laugh', 'wow', 'angry'];

    for (const reactionType of allowedReactions) {
      jest.clearAllMocks();
      (rateLimit as jest.Mock).mockResolvedValue({ success: true });
      (requireSession as jest.Mock).mockResolvedValue({ session: createTestSession() });
      (csrfGuard as jest.Mock).mockReturnValue(null);
      (parseBody as jest.Mock).mockResolvedValue({ data: { reactionType } });

      const mockUser = { _id: USER_ID, name: 'Test User', banned: false };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const mockComment = { _id: COMMENT_ID, author: 'other-user-id', reactions: [] };
      const mockJob = {
        _id: JOB_ID,
        comments: { id: jest.fn().mockReturnValue(mockComment) },
        toggleCommentReaction: jest.fn().mockReturnValue({
          reacted: true,
          reactionType,
          count: 1,
        }),
        save: jest.fn().mockResolvedValue(undefined),
      };
      (Job.findById as jest.Mock).mockResolvedValue(mockJob);

      const response = await postCommentReaction(
        makeRequest('POST', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`, {
          reactionType,
        }),
        { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
      );
      expect(response.status).toBe(200);
    }
  });
});

// ── GET /api/jobs/[jobId]/comments/[commentId]/react ──────────────────────────

describe('GET /api/jobs/[jobId]/comments/[commentId]/react', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when job not found', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    const response = await getCommentReactions(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 with reaction counts', async () => {
    (Job.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: JOB_ID,
        comments: [
          {
            _id: COMMENT_ID,
            reactions: [
              { user: 'user-1', type: 'heart' },
              { user: 'user-2', type: 'heart' },
              { user: 'user-3', type: 'thumbs_up' },
            ],
            replies: [],
          },
        ],
      }),
    });

    const response = await getCommentReactions(
      makeRequest('GET', `http://localhost/api/jobs/${JOB_ID}/comments/${COMMENT_ID}/react`),
      { params: Promise.resolve({ jobId: JOB_ID, commentId: COMMENT_ID }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.totalReactions).toBe(3);
    expect(payload.reactionCounts.heart).toBe(2);
    expect(payload.reactionCounts.thumbs_up).toBe(1);
  });
});
