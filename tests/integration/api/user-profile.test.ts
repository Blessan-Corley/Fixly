// Phase 2: Updated profile mutation integration coverage after writable document fixes.
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
    findOne: jest.fn(),
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

jest.mock('@/lib/redis', () => ({
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    invalidatePattern: jest.fn().mockResolvedValue(0),
  },
}));

import { getServerSession } from 'next-auth/next';

import { GET, PUT } from '@/app/api/user/profile/route';
import connectDB from '@/lib/mongodb';
import { ContentValidator } from '@/lib/validations/content-validator';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/profile', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns signup guidance for temporary sessions before hitting the database', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'temp_signup_user',
        email: 'temp@example.com',
      },
    });

    const response = await GET(new Request('http://localhost/api/user/profile'));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.needsSignup).toBe(true);
    expect(connectDB).not.toHaveBeenCalled();
  });

  it('blocks contact sharing in profile bio updates', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: userId,
        email: 'user@example.com',
      },
    });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: userId,
        role: 'fixer',
        banned: false,
        save,
        markModified: jest.fn(),
        locationHistory: [],
        preferences: {},
      }),
    });

    const response = await PUT(
      new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          bio: 'Contact me on 9876543210 for direct booking',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Bio');
    expect(save).not.toHaveBeenCalled();
  });

  it('updates fixer skills and availability with normalized data', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const userDoc = {
      _id: userId,
      role: 'fixer',
      banned: false,
      bio: '',
      skills: [],
      preferences: {},
      locationHistory: [],
      availableNow: false,
      serviceRadius: 5,
      save,
      markModified: jest.fn(),
    };

    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: userId,
        email: 'user@example.com',
      },
    });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(userDoc),
    });

    const response = await PUT(
      new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          bio: 'Trusted local plumbing specialist.',
          skills: [' Plumbing ', 'plumbing', 'Repairs'],
          availableNow: true,
          serviceRadius: 12,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(userDoc.skills).toEqual(['Plumbing', 'plumbing', 'Repairs']);
    expect(userDoc.availableNow).toBe(true);
    expect(userDoc.serviceRadius).toBe(12);
    expect(save).toHaveBeenCalled();
  });
});
