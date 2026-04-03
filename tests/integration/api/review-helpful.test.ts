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

jest.mock('mongoose', () => {
  function MockObjectId(this: { _id: string }, id: string) {
    this._id = id;
  }
  MockObjectId.isValid = jest.fn(
    (value: string) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
  );
  return {
    Types: {
      ObjectId: MockObjectId,
    },
  };
});

jest.mock('@/models/Review', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/validations/review', () => ({
  ReviewHelpfulSchema: {
    safeParse: jest.fn((data: { reviewId: string }) => ({
      success: true,
      data: { reviewId: data.reviewId },
    })),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/reviews/[reviewId]/helpful/route';
import Review from '@/models/Review';
import { TEST_CSRF_TOKEN, createTestSession } from '@/tests/helpers/auth';

const REVIEW_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439099';

function makeRequest(reviewId = REVIEW_ID): Request {
  return new Request(`http://localhost/api/reviews/${reviewId}/helpful`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': TEST_CSRF_TOKEN,
    },
  });
}

describe('/api/reviews/[reviewId]/helpful POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset rateLimit to allow by default
    const { rateLimit } = require('@/utils/rateLimiting');
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest(), { params: Promise.resolve({ reviewId: REVIEW_ID }) });

    expect(response.status).toBe(401);
  });

  it('returns 404 when review does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));
    (Review.findById as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest(), { params: Promise.resolve({ reviewId: REVIEW_ID }) });

    expect(response.status).toBe(404);
  });

  it('returns 400 when user tries to vote on their own review', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockReview = {
      _id: REVIEW_ID,
      reviewer: 'test-user-hirer-id',
      helpfulVotes: { count: 0, users: [] },
      save: jest.fn(),
    };
    (Review.findById as jest.Mock).mockResolvedValue(mockReview);

    const response = await POST(makeRequest(), { params: Promise.resolve({ reviewId: REVIEW_ID }) });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('cannot vote on your own review');
  });

  it('adds helpful vote when user has not voted yet', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockReview = {
      _id: REVIEW_ID,
      reviewer: OTHER_USER_ID,
      helpfulVotes: { count: 0, users: [] },
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Review.findById as jest.Mock).mockResolvedValue(mockReview);

    const response = await POST(makeRequest(), { params: Promise.resolve({ reviewId: REVIEW_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.action).toBe('added');
    expect(body.helpfulCount).toBe(1);
    expect(mockReview.save).toHaveBeenCalledTimes(1);
  });

  it('removes helpful vote when user has already voted', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const userId = 'test-user-hirer-id';
    const mockReview = {
      _id: REVIEW_ID,
      reviewer: OTHER_USER_ID,
      helpfulVotes: {
        count: 1,
        users: [userId],
      },
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Review.findById as jest.Mock).mockResolvedValue(mockReview);

    const response = await POST(makeRequest(), { params: Promise.resolve({ reviewId: REVIEW_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.action).toBe('removed');
    expect(body.helpfulCount).toBe(0);
  });

  it('returns 429 when rate limited', async () => {
    const { rateLimit } = require('@/utils/rateLimiting');
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const response = await POST(makeRequest(), { params: Promise.resolve({ reviewId: REVIEW_ID }) });

    expect(response.status).toBe(429);
  });

  it('initializes helpfulVotes when it does not exist on the review', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const mockReview = {
      _id: REVIEW_ID,
      reviewer: OTHER_USER_ID,
      // helpfulVotes is undefined — should be initialized
      helpfulVotes: undefined as unknown as { count: number; users: string[] },
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Review.findById as jest.Mock).mockResolvedValue(mockReview);

    const response = await POST(makeRequest(), { params: Promise.resolve({ reviewId: REVIEW_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('added');
  });

  it('returns 403 when CSRF token is missing', async () => {
    const { rateLimit } = require('@/utils/rateLimiting');
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });

    const { validateCsrfToken } = require('@/lib/security/csrf.server');
    (validateCsrfToken as jest.Mock).mockReturnValue({
      valid: false,
      reason: 'MISSING_HEADER_TOKEN',
    });
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession('hirer'));

    const requestWithoutCsrf = new Request(
      `http://localhost/api/reviews/${REVIEW_ID}/helpful`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(requestWithoutCsrf, { params: Promise.resolve({ reviewId: REVIEW_ID }) });

    expect(response.status).toBe(403);
  });
});
