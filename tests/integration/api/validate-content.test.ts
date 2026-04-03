jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/redis', () => ({
  redisRateLimit: jest.fn(),
  redisUtils: {
    setex: jest.fn(),
    get: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/validate-content/route';
import { redisRateLimit } from '@/lib/redis';
import { ContentValidator } from '@/lib/validations/content-validator';

describe('/api/validate-content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ContentValidator.violationCache.clear();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
      },
    });
    (redisRateLimit as jest.Mock).mockResolvedValue({
      success: true,
      resetTime: Date.now() + 60_000,
    });
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/validate-content', {
        method: 'POST',
        body: JSON.stringify({ content: 'hello', context: 'comment' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });

  it('blocks contact sharing in public content', async () => {
    const response = await POST(
      new Request('http://localhost/api/validate-content', {
        method: 'POST',
        body: JSON.stringify({ content: 'Call me at 9876543210', context: 'comment' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.isValid).toBe(false);
    expect(payload.violations.length).toBeGreaterThan(0);
  });

  it('allows contact sharing in private_message context', async () => {
    const response = await POST(
      new Request('http://localhost/api/validate-content', {
        method: 'POST',
        body: JSON.stringify({ content: 'Call me at 9876543210', context: 'private_message' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.isValid).toBe(true);
  });

  it('blocks abuse even in private messages', async () => {
    const response = await POST(
      new Request('http://localhost/api/validate-content', {
        method: 'POST',
        body: JSON.stringify({ content: 'You are an idiot', context: 'private_message' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.isValid).toBe(false);
  });
});
