import type { NextRequest } from 'next/server';

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  },
}));

import { getServerSession } from 'next-auth/next';

import * as fixerSubscriptionRoute from '@/app/api/subscription/fixer/route';
import * as hirerSubscriptionRoute from '@/app/api/subscription/hirer/route';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('subscription direct activation bypass block', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('removes POST /api/subscription/fixer activation endpoint', async () => {
    expect('POST' in fixerSubscriptionRoute).toBe(false);
  });

  it('removes POST /api/subscription/hirer activation endpoint', async () => {
    expect('POST' in hirerSubscriptionRoute).toBe(false);
  });

  it('keeps GET /api/subscription/fixer status reads working', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: userId, role: 'fixer' },
    });
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: userId,
        role: 'fixer',
        banned: false,
        isActive: true,
        deletedAt: null,
        plan: { type: 'free', status: 'active', creditsUsed: 1 },
      }),
    });

    const response = await fixerSubscriptionRoute.GET(
      new Request('http://localhost/api/subscription/fixer', {
        method: 'GET',
      }) as unknown as NextRequest
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.eligibility.canApplyToJobs).toBe(true);
  });
});
