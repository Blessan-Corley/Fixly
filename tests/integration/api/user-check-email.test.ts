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

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/user/check-email/route';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

describe('/api/user/check-email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: '507f1f77bcf86cd799439011' },
    });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });
  });

  it('returns 503 when email check rate limiting is degraded', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({
      success: false,
      degraded: true,
    });

    const response = await POST(
      new Request('http://localhost/api/user/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: 'person@example.com' }),
      })
    );

    expect(response.status).toBe(503);
  });

  it('returns 429 when email checks exceed the limit', async () => {
    (rateLimit as jest.Mock).mockResolvedValue({
      success: false,
      degraded: false,
    });

    const response = await POST(
      new Request('http://localhost/api/user/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: 'person@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many email checks');
  });

  it('requires authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/user/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: 'person@example.com' }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('rejects invalid email format', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-email' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Validation failed');
    expect(payload.details?.fieldErrors?.email).toBeDefined();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('returns unavailable when email already exists', async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'existing-user' }),
      }),
    });

    const response = await POST(
      new Request('http://localhost/api/user/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: 'taken@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.available).toBe(false);
  });

  it('returns available when email is not in use', async () => {
    const response = await POST(
      new Request('http://localhost/api/user/check-email', {
        method: 'POST',
        body: JSON.stringify({ email: 'free@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.available).toBe(true);
  });
});
