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
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/lib/auth-utils', () => ({
  invalidateAuthCache: jest.fn(),
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn(() => null),
  isCsrfExempt: jest.fn(() => false),
  validateCsrfMiddleware: jest.fn(() => null),
}));

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { DELETE, GET, PUT } from '@/app/api/user/privacy/route';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateAuthCache } from '@/lib/auth-utils';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF = 'test-csrf-token-for-integration-tests';
const USER_ID = 'test-user-id';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: { id: USER_ID, email: 'test@example.com', role, csrfToken: TEST_CSRF },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeRequest(
  method: string,
  body?: unknown,
  csrfToken = TEST_CSRF
): Request {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  return new Request('http://localhost/api/user/privacy', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/user/privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(404);
    });

    it('returns 200 with default privacy settings for a found user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockResolvedValue({
        _id: USER_ID,
        privacy: {
          profileVisibility: 'public',
          showPhone: true,
          showEmail: false,
        },
      });

      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.privacy).toBeDefined();
      expect(body.data.privacy.profileVisibility).toBe('public');
    });

    it('returns 200 with fallback defaults when user has no privacy field', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockResolvedValue({
        _id: USER_ID,
        privacy: null,
      });

      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.privacy.showPhone).toBe(true);
      expect(body.data.privacy.showEmail).toBe(false);
    });
  });

  describe('PUT', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await PUT(makeRequest('PUT', { privacy: { showPhone: true } }));
      expect(response.status).toBe(401);
    });

    it('returns 403 when CSRF token is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (csrfGuard as jest.Mock).mockReturnValueOnce(
        NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
      );

      const response = await PUT(makeRequest('PUT', { privacy: { showPhone: true } }, ''));
      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      (rateLimit as jest.Mock).mockResolvedValue({ success: false });
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await PUT(makeRequest('PUT', { privacy: { showPhone: true } }));
      expect(response.status).toBe(429);
    });

    it('returns 400 when privacy field is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await PUT(makeRequest('PUT', {}));
      expect(response.status).toBe(400);
    });

    it('returns 400 when profileVisibility is invalid', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await PUT(
        makeRequest('PUT', { privacy: { profileVisibility: 'invalid_value' } })
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 when a boolean field has invalid type', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await PUT(
        makeRequest('PUT', { privacy: { showPhone: 'yes' } })
      );
      expect(response.status).toBe(400);
    });

    it('returns 404 when user not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockResolvedValue(null);

      const response = await PUT(makeRequest('PUT', { privacy: { showPhone: true } }));
      expect(response.status).toBe(404);
    });

    it('returns 200 and updates privacy settings successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      const mockUser = {
        _id: USER_ID,
        privacy: { profileVisibility: 'public' },
        addNotification: jest.fn().mockResolvedValue(undefined),
      };
      const mockUpdatedUser = {
        _id: USER_ID,
        privacy: { profileVisibility: 'public', showPhone: false },
        addNotification: jest.fn().mockResolvedValue(undefined),
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const response = await PUT(makeRequest('PUT', { privacy: { showPhone: false } }));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.data.message).toBe('Privacy settings updated successfully');
    });
  });

  describe('DELETE', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(makeRequest('DELETE', { confirmDelete: 'DELETE_MY_ACCOUNT' }));
      expect(response.status).toBe(401);
    });

    it('returns 403 when CSRF token is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (csrfGuard as jest.Mock).mockReturnValueOnce(
        NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
      );

      const response = await DELETE(
        makeRequest('DELETE', { confirmDelete: 'DELETE_MY_ACCOUNT' }, '')
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 when confirmDelete is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await DELETE(makeRequest('DELETE', {}));
      expect(response.status).toBe(400);
    });

    it('returns 400 when confirmDelete has wrong value', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await DELETE(makeRequest('DELETE', { confirmDelete: 'wrong' }));
      expect(response.status).toBe(400);
    });

    it('returns 404 when user not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(makeRequest('DELETE', { confirmDelete: 'DELETE_MY_ACCOUNT' }));
      expect(response.status).toBe(404);
    });

    it('returns 200 and schedules account for deletion', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (User.findById as jest.Mock).mockResolvedValue({ _id: USER_ID });
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({ _id: USER_ID, isActive: false });
      (invalidateAuthCache as jest.Mock).mockResolvedValue(undefined);

      const response = await DELETE(makeRequest('DELETE', { confirmDelete: 'DELETE_MY_ACCOUNT' }));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.shouldSignOut).toBe(true);
      expect(invalidateAuthCache).toHaveBeenCalledWith(USER_ID);
    });
  });
});
