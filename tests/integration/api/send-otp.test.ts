jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/redis', () => ({
  authSlidingRateLimit: jest.fn(),
}));

jest.mock('@/lib/otpService', () => ({
  sendSignupOTP: jest.fn(),
  sendPasswordResetOTP: jest.fn(),
  generateOTP: jest.fn(),
  storeOTP: jest.fn(),
}));

jest.mock('@/lib/whatsapp', () => ({
  sendWhatsAppOTP: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByEmail: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/auth/send-otp/route';
import { sendSignupOTP, sendPasswordResetOTP, generateOTP, storeOTP } from '@/lib/otpService';
import { authSlidingRateLimit } from '@/lib/redis';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import User from '@/models/User';

describe('/api/auth/send-otp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: true });
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  it('rejects rate-limited OTP requests', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many attempts');
  });

  it('returns service unavailable when auth rate limiting is degraded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toBe(
      'Verification service temporarily unavailable. Please try again shortly.'
    );
  });

  it('rejects invalid OTP purposes', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'invite',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Valid OTP purpose is required');
  });

  it('rejects malformed JSON payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: '{',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid request body');
  });

  it('rejects invalid phone numbers', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: '123',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid phone number');
  });

  it('rejects duplicate signup phone numbers', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ _id: 'existing-user' });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: '9876543210',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toBe('Phone number already registered');
    expect(sendWhatsAppOTP).not.toHaveBeenCalled();
  });

  it('returns a temporary failure when phone OTP storage is unavailable', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (generateOTP as jest.Mock).mockReturnValue('123456');
    (storeOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'OTP service temporarily unavailable',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: '9876543210',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
    expect(sendWhatsAppOTP).not.toHaveBeenCalled();
  });

  it('returns an internal error when WhatsApp delivery fails', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (generateOTP as jest.Mock).mockReturnValue('123456');
    (storeOTP as jest.Mock).mockResolvedValue({ success: true });
    (sendWhatsAppOTP as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: '9876543210',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe('Failed to send WhatsApp message');
  });

  it('sends a WhatsApp OTP for a new signup phone number', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (generateOTP as jest.Mock).mockReturnValue('123456');
    (storeOTP as jest.Mock).mockResolvedValue({ success: true });
    (sendWhatsAppOTP as jest.Mock).mockResolvedValue(true);

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: '9876543210',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true, message: 'OTP sent via WhatsApp' });
  });

  it('rejects invalid email addresses', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Validation failed');
    expect(payload.details?.fieldErrors?.email).toBeDefined();
  });

  it('rejects duplicate signup email addresses', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue({ _id: 'existing-user' });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toBe('Email already registered');
  });

  it('surfaces signup email OTP delivery degradation', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    (sendSignupOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Email service temporarily unavailable',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('sends a signup OTP to email when the address is available', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    (sendSignupOTP as jest.Mock).mockResolvedValue({ success: true });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          name: 'Person',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true, message: 'OTP sent to email' });
    expect(sendSignupOTP).toHaveBeenCalledWith('person@example.com', 'Person');
  });

  it('sends an email verification OTP with the canonical flow', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
      },
    });
    (generateOTP as jest.Mock).mockReturnValue('123456');
    (storeOTP as jest.Mock).mockResolvedValue({ success: true });
    (sendSignupOTP as jest.Mock).mockResolvedValue({ success: true });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          name: 'Person',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(storeOTP).toHaveBeenCalledWith('person@example.com', '123456', 'email_verification');
    expect(sendSignupOTP).toHaveBeenCalledWith('person@example.com', 'Person', '123456');
  });

  it('requires authentication for email verification OTP sends', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe('Authentication required');
  });

  it('requires a session email for authenticated email OTP flows', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe('Authentication required');
  });

  it('rejects email verification when request email does not match the active session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'active@example.com',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('does not match');
  });

  it('requires current email for email change OTP sends', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'active@example.com',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          purpose: 'email_change',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Current email is required');
  });

  it('rejects email change when current email does not match the active session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'active@example.com',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          currentEmail: 'wrong@example.com',
          purpose: 'email_change',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Current email does not match');
  });

  it('rejects email change when the new email matches the current session email', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'active@example.com',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'active@example.com',
          currentEmail: 'active@example.com',
          purpose: 'email_change',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('New email must be different from your current email');
  });

  it('rejects email change when the target email is already registered', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'active@example.com',
      },
    });
    (User.findByEmail as jest.Mock).mockResolvedValue({ _id: 'existing-user' });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          currentEmail: 'active@example.com',
          purpose: 'email_change',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toBe('Email already registered');
  });

  it('sends a username change OTP when the session email matches', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
      },
    });
    (generateOTP as jest.Mock).mockReturnValue('123456');
    (storeOTP as jest.Mock).mockResolvedValue({ success: true });
    (sendSignupOTP as jest.Mock).mockResolvedValue({ success: true });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'username_change',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(storeOTP).toHaveBeenCalledWith('person@example.com', '123456', 'username_change');
  });

  it('returns a temporary failure when authenticated email OTP storage fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
      },
    });
    (generateOTP as jest.Mock).mockReturnValue('123456');
    (storeOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'OTP storage temporarily unavailable',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns a send failure when authenticated email OTP delivery fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: '507f1f77bcf86cd799439011',
        email: 'person@example.com',
      },
    });
    (generateOTP as jest.Mock).mockReturnValue('123456');
    (storeOTP as jest.Mock).mockResolvedValue({ success: true });
    (sendSignupOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Email delivery failed',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'email_verification',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe('Email delivery failed');
  });

  it('returns a temporary failure when password reset OTP delivery is unavailable', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue({
      _id: 'existing-user',
      name: 'Existing User',
    });
    (sendPasswordResetOTP as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Password reset temporarily unavailable',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'password_reset',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('does not leak account existence during password reset', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'missing@example.com',
          purpose: 'password_reset',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.message).toBe('If account exists, OTP sent');
    expect(sendPasswordResetOTP).not.toHaveBeenCalled();
  });

  it('rejects requests that omit both email and phone', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid request');
  });

  it('returns an internal server error on unexpected failures', async () => {
    (authSlidingRateLimit as jest.Mock).mockRejectedValue(new Error('redis down'));

    const response = await POST(
      new Request('http://localhost/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          purpose: 'signup',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe('Internal Server Error');
  });
});
