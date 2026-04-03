jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/lib/resilience/serviceGuard', () => ({
  withServiceFallback: jest.fn(async (fn, fallback) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }),
}));

import { GET } from '@/app/api/auth/status/route';
import { redisUtils } from '@/lib/redis';
import User from '@/models/User';

describe('/api/auth/status', () => {
  const internalAuthSecret = 'test-secret-123456789012345678901234567890';
  const originalSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_SECRET = internalAuthSecret;
    (redisUtils.get as jest.Mock).mockResolvedValue(null);
    (redisUtils.set as jest.Mock).mockResolvedValue('OK');
  });

  afterAll(() => {
    process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it('rejects requests without the internal auth header', async () => {
    const response = await GET(
      new Request('http://localhost/api/auth/status?id=507f1f77bcf86cd799439011')
    );

    expect(response.status).toBe(401);
  });

  it('returns cached auth status when available', async () => {
    (redisUtils.get as jest.Mock).mockResolvedValue({
      found: true,
      id: '507f1f77bcf86cd799439011',
      role: 'fixer',
      username: 'fixer_user',
      isRegistered: true,
      needsOnboarding: false,
      banned: false,
      isActive: true,
      deleted: false,
      lastUpdated: Date.now(),
    });

    const response = await GET(
      new Request('http://localhost/api/auth/status?id=507f1f77bcf86cd799439011', {
        headers: {
          'x-internal-auth-key': internalAuthSecret,
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.found).toBe(true);
    expect(payload.role).toBe('fixer');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('loads and caches auth status from the database when cache misses', async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: { toString: () => '507f1f77bcf86cd799439011' },
          role: 'admin',
          username: 'admin_user',
          isRegistered: true,
          authMethod: 'email',
          banned: false,
          isActive: true,
          deletedAt: null,
          updatedAt: new Date('2026-03-03T00:00:00.000Z'),
        }),
      }),
    });

    const response = await GET(
      new Request('http://localhost/api/auth/status?id=507f1f77bcf86cd799439011', {
        headers: {
          'x-internal-auth-key': internalAuthSecret,
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      found: true,
      id: '507f1f77bcf86cd799439011',
      role: 'admin',
      username: 'admin_user',
      isRegistered: true,
      needsOnboarding: false,
      authMethod: 'email',
      banned: false,
      isActive: true,
      deleted: false,
    });
    expect(redisUtils.set).toHaveBeenCalled();
  });

  it('returns not found when the user does not exist', async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    const response = await GET(
      new Request('http://localhost/api/auth/status?id=507f1f77bcf86cd799439011', {
        headers: {
          'x-internal-auth-key': internalAuthSecret,
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.found).toBe(false);
    expect(payload.isActive).toBe(false);
  });
});
