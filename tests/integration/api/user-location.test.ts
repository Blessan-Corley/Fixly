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

jest.mock('@/lib/redis', () => ({
  redisRateLimit: jest.fn(),
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidatePattern: jest.fn(),
  },
}));

jest.mock('@/lib/redisCache', () => ({
  invalidateUserCache: jest.fn(),
  withCache: jest.fn((handler: unknown) => handler),
}));

jest.mock('@/lib/locationTracking', () => ({
  getCurrentUserLocation: jest.fn(),
  updateCurrentLocation: jest.fn(),
  setHomeAddress: jest.fn(),
  getHomeAddress: jest.fn(),
  getLocationHistory: jest.fn(),
  getRecentLocations: jest.fn(),
  getLocationInsights: jest.fn(),
}));

jest.mock('@/lib/services/locationHistoryService', () => ({
  getUserLocationHistory: jest.fn(),
  getUserJobSuggestions: jest.fn(),
  updateUserLocation: jest.fn(),
  startUserLocationTracking: jest.fn(),
  stopUserLocationTracking: jest.fn(),
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

jest.mock('@/lib/redisCache', () => {
  const { NextRequest } = require('next/server');
  return {
    invalidateUserCache: jest.fn(),
    withCache: jest.fn((handler: unknown) => {
      return async (req: Request, ctx: unknown) => {
        // Build a NextRequest-like object to avoid JSDOM's broken NextRequest constructor
        const url = new URL(req.url ?? 'http://localhost/');
        const nextReqLike = Object.create(NextRequest.prototype) as InstanceType<typeof NextRequest>;
        Object.defineProperty(nextReqLike, 'nextUrl', { value: url, configurable: true, writable: true });
        Object.defineProperty(nextReqLike, 'url', { value: req.url, configurable: true });
        Object.defineProperty(nextReqLike, 'method', { value: req.method || 'GET', configurable: true });
        Object.defineProperty(nextReqLike, 'headers', { value: req.headers, configurable: true });
        return (handler as (...args: unknown[]) => Promise<Response>)(nextReqLike, ctx);
      };
    }),
  };
});

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { GET as locationGET, POST as locationPOST } from '@/app/api/user/location/route';
import { GET as historyGET, POST as historyPOST } from '@/app/api/user/location/history/route';
import { csrfGuard } from '@/lib/security/csrf';
import { redisRateLimit } from '@/lib/redis';
import {
  getCurrentUserLocation,
  updateCurrentLocation,
} from '@/lib/locationTracking';
import {
  getUserLocationHistory,
  updateUserLocation,
  startUserLocationTracking,
  stopUserLocationTracking,
} from '@/lib/services/locationHistoryService';
import { rateLimit } from '@/utils/rateLimiting';

const TEST_CSRF = 'test-csrf-token-for-integration-tests';
const USER_ID = 'test-user-id';

function createTestSession(role: 'hirer' | 'fixer' | 'admin' = 'hirer') {
  return {
    user: { id: USER_ID, email: 'test@example.com', role, csrfToken: TEST_CSRF },
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function makeNextRequest(
  method: string,
  url: string,
  body?: unknown,
  csrfToken = TEST_CSRF
): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['x-csrf-token'] = csrfToken;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe('/api/user/location', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (redisRateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await locationGET(
        makeNextRequest('GET', 'http://localhost/api/user/location')
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when CSRF token is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (csrfGuard as jest.Mock).mockReturnValueOnce(
        NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
      );

      const response = await locationGET(
        makeNextRequest('GET', 'http://localhost/api/user/location', undefined, '')
      );
      expect(response.status).toBe(403);
    });

    it('returns 429 when rate limited', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (redisRateLimit as jest.Mock).mockResolvedValue({ success: false, resetTime: Date.now() + 60000 });

      const response = await locationGET(
        makeNextRequest('GET', 'http://localhost/api/user/location')
      );
      expect(response.status).toBe(429);
    });

    it('returns 200 with current location data', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (getCurrentUserLocation as jest.Mock).mockResolvedValue({
        lat: 12.9716,
        lng: 77.5946,
        address: 'Bengaluru',
      });

      const response = await locationGET(
        makeNextRequest('GET', 'http://localhost/api/user/location?type=current')
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await locationPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location', { lat: 12.97, lng: 77.59 })
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 when CSRF token is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (csrfGuard as jest.Mock).mockReturnValueOnce(
        NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
      );

      const response = await locationPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location', { lat: 12.97, lng: 77.59 }, '')
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 when lat/lng are missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await locationPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location', {})
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 when coordinates are invalid', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await locationPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location', { lat: 999, lng: 200 })
      );
      expect(response.status).toBe(400);
    });

    it('returns 200 and updates location successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (updateCurrentLocation as jest.Mock).mockResolvedValue({ lat: 12.97, lng: 77.59 });

      const response = await locationPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location', {
          lat: 12.97,
          lng: 77.59,
          address: 'Bengaluru',
        })
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Location updated successfully');
    });
  });
});

describe('/api/user/location/history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await historyGET(
        makeNextRequest('GET', 'http://localhost/api/user/location/history')
      );
      expect(response.status).toBe(401);
    });

    it('returns 200 with location history', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (getUserLocationHistory as jest.Mock).mockResolvedValue({
        history: [{ lat: 12.97, lng: 77.59, timestamp: new Date().toISOString() }],
        count: 1,
      });

      const response = await historyGET(
        makeNextRequest('GET', 'http://localhost/api/user/location/history')
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });
  });

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await historyPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location/history', {
          action: 'update',
          location: { latitude: 12.97, longitude: 77.59 },
        })
      );
      expect(response.status).toBe(401);
    });

    it('returns 429 when rate limited', async () => {
      (rateLimit as jest.Mock).mockResolvedValue({ success: false });
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await historyPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location/history', {
          action: 'update',
          location: { latitude: 12.97, longitude: 77.59 },
        })
      );
      expect(response.status).toBe(429);
    });

    it('returns 403 when CSRF token is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (csrfGuard as jest.Mock).mockReturnValueOnce(
        NextResponse.json({ error: 'CSRF_INVALID' }, { status: 403 })
      );

      const response = await historyPOST(
        makeNextRequest(
          'POST',
          'http://localhost/api/user/location/history',
          { action: 'update', location: { latitude: 12.97, longitude: 77.59 } },
          ''
        )
      );
      expect(response.status).toBe(403);
    });

    it('returns 400 when action is invalid', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await historyPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location/history', {
          action: 'invalid_action',
        })
      );
      expect(response.status).toBe(400);
    });

    it('returns 400 when location payload is missing for update action', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());

      const response = await historyPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location/history', {
          action: 'update',
        })
      );
      expect(response.status).toBe(400);
    });

    it('returns 200 when action is update with valid location', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (updateUserLocation as jest.Mock).mockResolvedValue({ lat: 12.97, lng: 77.59 });

      const response = await historyPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location/history', {
          action: 'update',
          location: { latitude: 12.97, longitude: 77.59 },
        })
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('returns 200 when action is start_tracking', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (startUserLocationTracking as jest.Mock).mockResolvedValue(undefined);

      const response = await historyPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location/history', {
          action: 'start_tracking',
        })
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Location tracking started');
    });

    it('returns 200 when action is stop_tracking', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(createTestSession());
      (stopUserLocationTracking as jest.Mock).mockResolvedValue(undefined);

      const response = await historyPOST(
        makeNextRequest('POST', 'http://localhost/api/user/location/history', {
          action: 'stop_tracking',
        })
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Location tracking stopped');
    });
  });
});
