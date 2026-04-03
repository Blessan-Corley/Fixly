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
  authSlidingRateLimit: jest.fn(),
}));

jest.mock('@/lib/otpService', () => ({
  sendPasswordResetOTP: jest.fn(),
}));

import { POST } from '@/app/api/auth/forgot-password/route';
import { sendPasswordResetOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import User from '@/models/User';

type EligibleUser = {
  name: string;
  email: string;
  authMethod: 'email' | 'google';
  googleId?: string;
  banned?: boolean;
  isActive?: boolean;
  deletedAt?: Date;
};

function mockUserLookupResult(user: EligibleUser | null) {
  (User.findOne as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue(user),
  });
}

describe('/api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: true });
    (sendPasswordResetOTP as jest.Mock).mockResolvedValue({ success: true });
    mockUserLookupResult(null);
  });

  it('returns 503 when forgot-password rate limiting is degraded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'person@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns 429 when rate limited', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({
      success: false,
      degraded: false,
      remaining: 0,
      resetTime: Date.now() + 15 * 60 * 1000,
    });

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'person@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many password reset attempts');
    expect(payload.resetTime).toBeUndefined();
    expect(payload.remaining).toBeUndefined();
  });

  it('returns 400 for non-object request bodies', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(['person@example.com']),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Validation failed');
  });

  it('returns 400 for invalid email format', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Validation failed');
    expect(payload.details?.fieldErrors?.email).toBeDefined();
  });

  it('accepts x-real-ip as the client identifier when forwarded headers are absent', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({
      success: false,
      degraded: false,
      remaining: 0,
      resetTime: Date.now() + 15 * 60 * 1000,
    });

    await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'x-real-ip': '10.0.0.8',
        },
        body: JSON.stringify({ email: 'person@example.com' }),
      })
    );

    expect(authSlidingRateLimit).toHaveBeenCalledWith('forgot_password:10.0.0.8', 3, 15 * 60);
  });

  it('returns 400 for malformed JSON payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: '{',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid request body');
  });

  it('returns a generic success response when user is not found', async () => {
    mockUserLookupResult(null);

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'unknown@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('eligible account exists');
    expect(payload.expiresIn).toBe(300);
    expect(sendPasswordResetOTP).not.toHaveBeenCalled();
  });

  it('returns a generic success response when account uses google login', async () => {
    mockUserLookupResult({
      name: 'Google User',
      email: 'google@example.com',
      authMethod: 'google',
      googleId: 'google-123',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'google@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('eligible account exists');
    expect(sendPasswordResetOTP).not.toHaveBeenCalled();
  });

  it('returns a generic success response when account is not eligible for reset', async () => {
    mockUserLookupResult({
      name: 'Disabled User',
      email: 'disabled@example.com',
      authMethod: 'email',
      isActive: false,
    });

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'disabled@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('eligible account exists');
    expect(sendPasswordResetOTP).not.toHaveBeenCalled();
  });

  it('returns a generic success response when OTP delivery is temporarily unavailable', async () => {
    mockUserLookupResult({
      name: 'Email User',
      email: 'email@example.com',
      authMethod: 'email',
    });
    (sendPasswordResetOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Verification service temporarily unavailable. Please try again shortly.',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'email@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('eligible account exists');
    expect(sendPasswordResetOTP).toHaveBeenCalledWith('email@example.com', 'Email User');
  });

  it('returns a generic success response when OTP delivery fails unexpectedly', async () => {
    mockUserLookupResult({
      name: 'Email User',
      email: 'email@example.com',
      authMethod: 'email',
    });
    (sendPasswordResetOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'SMTP error',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'email@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('eligible account exists');
    expect(sendPasswordResetOTP).toHaveBeenCalledWith('email@example.com', 'Email User');
  });

  it('sends OTP and returns success payload for eligible email accounts', async () => {
    mockUserLookupResult({
      name: 'Email User',
      email: 'email@example.com',
      authMethod: 'email',
    });
    (sendPasswordResetOTP as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Password reset OTP sent successfully to your email address.',
      expiresIn: 300,
    });

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'email@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.expiresIn).toBe(300);
    expect(sendPasswordResetOTP).toHaveBeenCalledWith('email@example.com', 'Email User');
  });

  it('returns 500 when the route throws unexpectedly', async () => {
    (authSlidingRateLimit as jest.Mock).mockRejectedValue(new Error('redis down'));

    const response = await POST(
      new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'email@example.com' }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toContain('Please try again later');
  });
});
