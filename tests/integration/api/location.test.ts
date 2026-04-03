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

// withCache is called at module-load time in the route — it wraps the inner handler.
// We make it a passthrough so the inner function is used directly.
jest.mock('@/lib/redisCache', () => ({
  withCache: jest.fn(
    (fn: (req: Request, ctx: Record<string, unknown>) => Promise<Response>) => fn
  ),
  invalidateCache: jest.fn().mockResolvedValue(true),
  invalidateUserCache: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    invalidatePattern: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('@/lib/resilience/serviceGuard', () => ({
  withServiceFallback: jest.fn((fn: () => unknown) => fn()),
}));

jest.mock('@/models/LocationPreference', () => {
  const MockLocationPreference = jest.fn().mockImplementation((data: unknown) => ({
    ...(data as object),
    currentLocation: {},
    locationHistory: [],
    preferences: {
      maxTravelDistance: 25,
      autoLocationEnabled: false,
      locationSharingConsent: false,
    },
    privacy: {
      shareExactLocation: false,
      shareApproximateLocation: true,
      trackLocationHistory: false,
    },
    isLocationRecent: jest.fn(() => false),
    updateLocation: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
  }));

  Object.assign(MockLocationPreference, { findOne: jest.fn() });

  return {
    __esModule: true,
    default: MockLocationPreference,
  };
});

import { getServerSession } from 'next-auth/next';

import { DELETE, GET, POST, PUT } from '@/app/api/location/route';
import LocationPreference from '@/models/LocationPreference';
import { TEST_CSRF_TOKEN } from '@/tests/helpers/auth';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/location', () => {
  const userId = '507f1f77bcf86cd799439011';

  const makeLocationDoc = (overrides: Record<string, unknown> = {}) => ({
    currentLocation: { lat: 12.97, lng: 77.59, city: 'Bengaluru', state: 'Karnataka' },
    preferences: {
      maxTravelDistance: 25,
      autoLocationEnabled: true,
      locationSharingConsent: true,
    },
    privacy: {
      shareExactLocation: false,
      shareApproximateLocation: true,
      trackLocationHistory: false,
    },
    lastLocationUpdate: new Date(),
    locationHistory: [],
    isLocationRecent: jest.fn(() => true),
    updateLocation: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({
      success: true,
      remainingAttempts: 10,
      resetTime: Date.now() + 60_000,
    });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: userId,
        email: 'test-hirer@example.com',
        role: 'hirer',
        csrfToken: TEST_CSRF_TOKEN,
      },
    });
  });

  // ─── GET ────────────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/location', { method: 'GET' })
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBe('Authentication required');
    });

    it('returns 429 when rate limited', async () => {
      (rateLimit as jest.Mock).mockResolvedValue({
        success: false,
        remainingAttempts: 0,
        resetTime: Date.now() + 60_000,
      });

      const response = await GET(
        new Request('http://localhost/api/location', { method: 'GET' })
      );

      expect(response.status).toBe(429);
    });

    it('returns default location data when no location saved yet', async () => {
      (LocationPreference.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const response = await GET(
        new Request('http://localhost/api/location', { method: 'GET' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      // ok() wraps the inner object: { success: true, data: { success: true, data: { hasLocation: false } } }
      expect(payload.success).toBe(true);
      expect(payload.data.data.hasLocation).toBe(false);
      expect(payload.data.data.preferences).toBeDefined();
    });

    it('returns location data for authenticated user with saved location', async () => {
      const locationDoc = makeLocationDoc();
      (LocationPreference.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(locationDoc),
      });

      const response = await GET(
        new Request('http://localhost/api/location', { method: 'GET' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.data.hasLocation).toBe(true);
    });
  });

  // ─── POST ───────────────────────────────────────────────────────────────────

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await POST(
        new Request('http://localhost/api/location', {
          method: 'POST',
          body: JSON.stringify({ lat: 12.97, lng: 77.59, consent: true }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBe('Authentication required');
    });

    it('returns 403 when CSRF token does not match session token', async () => {
      // Use a session with a different csrfToken so the header won't match
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: userId,
          email: 'test-hirer@example.com',
          role: 'hirer',
          csrfToken: 'a-completely-different-secret-token-not-matching-header',
        },
      });

      // Provide a mismatched header token (jest.setup.js auto-attaches TEST_CSRF_TOKEN)
      const response = await POST(
        new Request('http://localhost/api/location', {
          method: 'POST',
          headers: { 'x-csrf-token': 'wrong-token-that-does-not-match' },
          body: JSON.stringify({ lat: 12.97, lng: 77.59, consent: true }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('returns 400 when required fields are missing (no lat/lng)', async () => {
      const response = await POST(
        new Request('http://localhost/api/location', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ consent: true }),
        })
      );

      expect(response.status).toBe(400);
    });

    it('returns 400 when consent is not true', async () => {
      const response = await POST(
        new Request('http://localhost/api/location', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ lat: 12.97, lng: 77.59, consent: false }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message ?? payload.error).toMatch(/consent/i);
    });

    it('saves location successfully with valid data', async () => {
      const locationDoc = makeLocationDoc();
      (LocationPreference.findOne as jest.Mock).mockResolvedValue(locationDoc);

      const response = await POST(
        new Request('http://localhost/api/location', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            lat: 12.97,
            lng: 77.59,
            city: 'Bengaluru',
            state: 'Karnataka',
            consent: true,
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(locationDoc.updateLocation).toHaveBeenCalled();
    });

    it('creates a new location record when none exists', async () => {
      (LocationPreference.findOne as jest.Mock).mockResolvedValue(null);
      const newDoc = makeLocationDoc();
      (LocationPreference as unknown as jest.Mock).mockImplementation(() => newDoc);

      const response = await POST(
        new Request('http://localhost/api/location', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({
            lat: 12.97,
            lng: 77.59,
            consent: true,
          }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
    });

    it('returns 429 when rate limited on POST', async () => {
      (rateLimit as jest.Mock).mockResolvedValue({
        success: false,
        remainingAttempts: 0,
        resetTime: Date.now() + 60_000,
      });

      const response = await POST(
        new Request('http://localhost/api/location', {
          method: 'POST',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ lat: 12.97, lng: 77.59, consent: true }),
        })
      );

      expect(response.status).toBe(429);
    });
  });

  // ─── PUT ────────────────────────────────────────────────────────────────────

  describe('PUT', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await PUT(
        new Request('http://localhost/api/location', {
          method: 'PUT',
          body: JSON.stringify({ maxTravelDistance: 30 }),
        })
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
          csrfToken: 'a-completely-different-secret-token-not-matching-any-header',
        },
      });

      const response = await PUT(
        new Request('http://localhost/api/location', {
          method: 'PUT',
          headers: { 'x-csrf-token': 'wrong-token-that-does-not-match' },
          body: JSON.stringify({ maxTravelDistance: 30 }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('updates location preferences successfully', async () => {
      const locationDoc = makeLocationDoc();
      (LocationPreference.findOne as jest.Mock).mockResolvedValue(locationDoc);

      const response = await PUT(
        new Request('http://localhost/api/location', {
          method: 'PUT',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ maxTravelDistance: 50, autoLocationEnabled: true }),
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(locationDoc.save).toHaveBeenCalled();
    });

    it('creates a new location preference record when none exists', async () => {
      (LocationPreference.findOne as jest.Mock).mockResolvedValue(null);
      const newDoc = makeLocationDoc();
      (LocationPreference as unknown as jest.Mock).mockImplementation(() => newDoc);

      const response = await PUT(
        new Request('http://localhost/api/location', {
          method: 'PUT',
          headers: { 'x-csrf-token': TEST_CSRF_TOKEN },
          body: JSON.stringify({ shareApproximateLocation: true }),
        })
      );

      expect(response.status).toBe(200);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────────

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/location', { method: 'DELETE' })
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.error).toBe('Authentication required');
    });

    it('clears location data successfully', async () => {
      const locationDoc = makeLocationDoc();
      (LocationPreference.findOne as jest.Mock).mockResolvedValue(locationDoc);

      const response = await DELETE(
        new Request('http://localhost/api/location', { method: 'DELETE' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(locationDoc.save).toHaveBeenCalled();
    });

    it('succeeds gracefully when no location record exists', async () => {
      (LocationPreference.findOne as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(
        new Request('http://localhost/api/location', { method: 'DELETE' })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
    });
  });
});
