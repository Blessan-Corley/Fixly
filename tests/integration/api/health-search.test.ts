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

jest.mock('@/lib/resilience/serviceGuard', () => ({
  checkAllServices: jest.fn(),
}));

jest.mock('@/lib/redisCache', () => ({
  withCache: jest.fn((fn: (req: Request, ctx: Record<string, unknown>) => unknown) => fn),
}));

jest.mock('@/models/Job', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  createRequestLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('server-only', () => ({}));

jest.mock('@/lib/security/csrf.server', () => ({
  validateCsrfToken: jest.fn(() => ({ valid: true })),
  generateCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
  getCsrfToken: jest.fn(() => 'test-csrf-token-for-integration-tests'),
}));

import type { NextRequest } from 'next/server';

import { GET as getHealth, HEAD as headHealth } from '@/app/api/health/route';
import { GET as getSearchSuggestions } from '@/app/api/search/suggestions/route';
import { checkAllServices } from '@/lib/resilience/serviceGuard';
import Job from '@/models/Job';
import { rateLimit } from '@/utils/rateLimiting';

const makeRequest = (method: string, url: string) =>
  new Request(url, { method }) as unknown as NextRequest;

// ─── /api/health ────────────────────────────────────────────────────────────

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when all services are available', async () => {
    (checkAllServices as jest.Mock).mockResolvedValue({
      mongo: { available: true },
      redis: { available: true },
      ably: { available: true },
    });

    const response = await getHealth();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('ok');
    expect(payload.services).toBeDefined();
    expect(payload.timestamp).toBeDefined();
  });

  it('returns 200 degraded when non-mongo service is down', async () => {
    (checkAllServices as jest.Mock).mockResolvedValue({
      mongo: { available: true },
      redis: { available: false, error: 'Connection refused' },
      ably: { available: true },
    });

    const response = await getHealth();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe('degraded');
  });

  it('returns 503 when mongo is down', async () => {
    (checkAllServices as jest.Mock).mockResolvedValue({
      mongo: { available: false, error: 'Connection refused' },
      redis: { available: true },
      ably: { available: true },
    });

    const response = await getHealth();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.status).toBe('down');
  });

  it('returns 503 and down status when checkAllServices throws', async () => {
    (checkAllServices as jest.Mock).mockRejectedValue(new Error('unexpected failure'));

    const response = await getHealth();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.status).toBe('down');
  });

  it('HEAD returns 200', async () => {
    const response = await headHealth();
    expect(response.status).toBe(200);
  });
});

// ─── /api/search/suggestions ────────────────────────────────────────────────

describe('/api/search/suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns 429 when rate limited', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({ success: false });
    const response = await getSearchSuggestions(
      makeRequest('GET', 'http://localhost/api/search/suggestions?q=plumb')
    );
    expect(response.status).toBe(429);
  });

  it('returns empty array for query shorter than 2 chars', async () => {
    const response = await getSearchSuggestions(
      makeRequest('GET', 'http://localhost/api/search/suggestions?q=p')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(0);
  });

  it('returns empty array when q param is missing', async () => {
    const response = await getSearchSuggestions(
      makeRequest('GET', 'http://localhost/api/search/suggestions')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(0);
  });

  it('returns suggestions from DB and popular terms for valid query', async () => {
    (Job.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { title: 'plumbing repair downtown', skillsRequired: ['plumbing'] },
      ]),
    });

    const response = await getSearchSuggestions(
      makeRequest('GET', 'http://localhost/api/search/suggestions?q=plumb')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload)).toBe(true);
  });

  it('returns only popular terms when DB returns no matching jobs', async () => {
    (Job.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const response = await getSearchSuggestions(
      makeRequest('GET', 'http://localhost/api/search/suggestions?q=electrical')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload)).toBe(true);
    // Should include "electrical work" from POPULAR_TERMS
    expect(payload.some((s: string) => s.toLowerCase().includes('electrical'))).toBe(true);
  });

  it('limits results to at most 5 suggestions', async () => {
    (Job.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { title: 'painting walls', skillsRequired: ['painting', 'wall prep'] },
        { title: 'painting ceilings', skillsRequired: ['painting'] },
        { title: 'painting fences', skillsRequired: ['painting', 'outdoor'] },
      ]),
    });

    const response = await getSearchSuggestions(
      makeRequest('GET', 'http://localhost/api/search/suggestions?q=paint')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.length).toBeLessThanOrEqual(5);
  });
});
