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

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

jest.mock('@/models/Review', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    getAverageRating: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidatePattern: jest.fn(),
  },
}));

jest.mock('@/lib/services/public-profiles/service', () => ({
  getPublicUserProfile: jest.fn(),
}));

jest.mock('@/lib/services/public-reviews', () => ({
  listUserReviews: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { GET as getProfileByUsername } from '@/app/api/user/profile/[username]/route';
import { GET as searchProfiles } from '@/app/api/user/profile/search/route';
import { GET as getPublicUser } from '@/app/api/users/[userId]/public/route';
import { GET as getUserReviews } from '@/app/api/users/[userId]/reviews/route';
import { redisUtils } from '@/lib/redis';
import { getPublicUserProfile } from '@/lib/services/public-profiles/service';
import { listUserReviews } from '@/lib/services/public-reviews';
import Job from '@/models/Job';
import Review from '@/models/Review';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF = 'test-csrf-token-for-integration-tests';
const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439022';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: { id: USER_ID, email: 'test@example.com', role, csrfToken: TEST_CSRF },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

/**
 * Create a NextRequest-like object that has `nextUrl` populated from the URL string.
 * JSDOM does not support constructing a real NextRequest (the URL property is read-only
 * in that environment), so we cast and inject `nextUrl` manually.
 */
function makeReviewsRequest(url: string): NextRequest {
  const req = new Request(url) as unknown as NextRequest;
  const parsedUrl = new URL(url);
  Object.defineProperty(req, 'nextUrl', {
    value: parsedUrl,
    configurable: true,
    writable: true,
  });
  return req;
}

describe('/api/user/profile/[username]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (redisUtils.get as jest.Mock).mockResolvedValue(null);
    (redisUtils.set as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await getProfileByUsername(
      new Request('http://localhost/api/user/profile/testuser'),
      { params: Promise.resolve({ username: 'testuser' }) }
    );
    expect(response.status).toBe(429);
  });

  it('returns 400 when username is empty', async () => {
    const response = await getProfileByUsername(
      new Request('http://localhost/api/user/profile/'),
      { params: Promise.resolve({ username: '' }) }
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when user does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const response = await getProfileByUsername(
      new Request('http://localhost/api/user/profile/nonexistent'),
      { params: Promise.resolve({ username: 'nonexistent' }) }
    );
    expect(response.status).toBe(404);
  });

  it('returns 200 and hides sensitive fields for unauthenticated requests', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const mockUser = {
      _id: OTHER_USER_ID,
      username: 'otheruser',
      name: 'Other User',
      phone: '+91 9876543210',
      address: '123 Main St',
    };
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      }),
    });
    (Job.aggregate as jest.Mock).mockResolvedValue([]);
    (Review.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (Review.getAverageRating as jest.Mock).mockResolvedValue({ average: 4.5, count: 10 });

    const response = await getProfileByUsername(
      new Request('http://localhost/api/user/profile/otheruser'),
      { params: Promise.resolve({ username: 'otheruser' }) }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.phone).toBeUndefined();
    expect(body.user.address).toBeUndefined();
  });

  it('returns 200 and includes cached response on cache hit', async () => {
    (redisUtils.get as jest.Mock).mockResolvedValue(
      JSON.stringify({ success: true, user: { username: 'cacheduser' } })
    );

    const response = await getProfileByUsername(
      new Request('http://localhost/api/user/profile/cacheduser'),
      { params: Promise.resolve({ username: 'cacheduser' }) }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.user.username).toBe('cacheduser');
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe('/api/user/profile/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await searchProfiles(
      new Request('http://localhost/api/user/profile/search')
    );
    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await searchProfiles(
      new Request('http://localhost/api/user/profile/search')
    );
    expect(response.status).toBe(429);
  });

  it('returns 200 with paginated user list', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    const mockUsers = [
      { _id: OTHER_USER_ID, name: 'Fixer User', role: 'fixer', isActive: true },
    ];
    (User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockUsers),
    });
    (User.countDocuments as jest.Mock).mockResolvedValue(1);

    const response = await searchProfiles(
      new Request('http://localhost/api/user/profile/search?role=fixer')
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.users).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  it('returns 200 with empty results when no users match', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
    (User.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (User.countDocuments as jest.Mock).mockResolvedValue(0);

    const response = await searchProfiles(
      new Request('http://localhost/api/user/profile/search?search=nonexistentuser')
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });
});

describe('/api/users/[userId]/public', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with public user profile', async () => {
    const mockProfile = {
      _id: OTHER_USER_ID,
      name: 'Public User',
      username: 'publicuser',
      role: 'fixer',
    };
    (getPublicUserProfile as jest.Mock).mockResolvedValue(mockProfile);

    const response = await getPublicUser(
      new Request(`http://localhost/api/users/${OTHER_USER_ID}/public`) as unknown as NextRequest,
      { params: Promise.resolve({ userId: OTHER_USER_ID }) }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
  });

  it('returns 500 when the service throws an error', async () => {
    (getPublicUserProfile as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = await getPublicUser(
      new Request(`http://localhost/api/users/${OTHER_USER_ID}/public`) as unknown as NextRequest,
      { params: Promise.resolve({ userId: OTHER_USER_ID }) }
    );
    expect(response.status).toBe(500);
  });
});

describe('/api/users/[userId]/reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 422 when userId is missing', async () => {
    const response = (await getUserReviews(
      new Request('http://localhost/api/users//reviews') as unknown as NextRequest,
      { params: Promise.resolve({ userId: '' }) }
    )) as Response;
    expect(response.status).toBe(422);
  });

  it('returns 200 with user reviews and stats', async () => {
    (listUserReviews as jest.Mock).mockResolvedValue({
      items: [{ _id: 'review-1', rating: 5, comment: 'Great!' }],
      total: 1,
      stats: {
        averageRating: 5,
        totalReviews: 1,
        distribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    });

    const response = (await getUserReviews(
      makeReviewsRequest(`http://localhost/api/users/${OTHER_USER_ID}/reviews`),
      { params: Promise.resolve({ userId: OTHER_USER_ID }) }
    )) as Response;
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.meta.averageRating).toBe(5);
    expect(body.meta.totalReviews).toBe(1);
  });

  it('returns 500 when the reviews service throws an error', async () => {
    (listUserReviews as jest.Mock).mockRejectedValue(new Error('DB error'));

    const response = (await getUserReviews(
      makeReviewsRequest(`http://localhost/api/users/${OTHER_USER_ID}/reviews`),
      { params: Promise.resolve({ userId: OTHER_USER_ID }) }
    )) as Response;
    expect(response.status).toBe(500);
  });
});
