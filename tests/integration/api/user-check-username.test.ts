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
  },
}));

jest.mock('@/utils/rateLimiting', () => ({
  rateLimit: jest.fn(),
}));

// Phase 2: Updated username availability tests for the consolidated content validation module.
jest.mock('@/lib/validations/content', () => ({
  ContentValidator: {
    validateUsername: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/user/check-username/route';
import { ContentValidator } from '@/lib/validations/content';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/check-username', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011' },
    });
    (ContentValidator.validateUsername as jest.Mock).mockResolvedValue({
      isValid: true,
      violations: [],
      suggestions: [],
    });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
  });

  it('returns 503 when username check rate limiting is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({
      success: false,
      degraded: true,
    });

    const response = await POST(
      new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        body: JSON.stringify({ username: 'fixer_name' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns 429 when username checks exceed the limit', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({
      success: false,
      degraded: false,
      remainingTime: 60_000,
    });

    const response = await POST(
      new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        body: JSON.stringify({ username: 'fixer_name' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many username checks');
  });

  it('rejects unauthenticated username checks', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        body: JSON.stringify({ username: 'fixer_name' }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('rejects invalid usernames before database lookup', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        body: JSON.stringify({ username: '##' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.available).toBe(false);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('rejects abusive usernames via content validator', async () => {
    (ContentValidator.validateUsername as jest.Mock).mockResolvedValue({
      isValid: false,
      violations: [{ message: 'Username contains prohibited content' }],
      suggestions: ['Try a neutral username'],
    });

    const response = await POST(
      new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        body: JSON.stringify({ username: 'abusive_name' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('prohibited');
  });

  it('returns unavailable when username is already taken', async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'existing-user' }),
      }),
    });

    const response = await POST(
      new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        body: JSON.stringify({ username: 'taken_name' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.available).toBe(false);
  });

  it('returns available when username is free and valid', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/check-username', {
        method: 'POST',
        body: JSON.stringify({ username: 'available_name' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.available).toBe(true);
  });
});
