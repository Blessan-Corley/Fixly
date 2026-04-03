// Phase 2: Updated signup integration coverage for the hardened auth and content validation flows.
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

jest.mock('@/lib/redis', () => ({
  authSlidingRateLimit: jest.fn(),
  isAuthRedisDegraded: jest.fn(),
}));

jest.mock('@/lib/otpService', () => ({
  consumeOTPVerification: jest.fn(),
  hasOTPVerification: jest.fn(),
}));

jest.mock('@/services/auth/googleService', () => ({
  GoogleAuthService: {
    completeProfile: jest.fn(),
  },
}));

jest.mock('@/services/auth/registrationService', () => ({
  RegistrationService: {
    registerUser: jest.fn(),
  },
}));

jest.mock('@/lib/validations/content', () => ({
  ContentValidator: {
    validateContent: jest.fn(),
    validateUsername: jest.fn(),
    validateSkills: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';

import { POST } from '@/app/api/auth/signup/route';
import { consumeOTPVerification, hasOTPVerification } from '@/lib/otpService';
import { authSlidingRateLimit, isAuthRedisDegraded } from '@/lib/redis';
import { ContentValidator } from '@/lib/validations/content';
import { GoogleAuthService } from '@/services/auth/googleService';
import { RegistrationService } from '@/services/auth/registrationService';

type SignupBodyOverrides = Partial<{
  authMethod: 'email' | 'google';
  role: 'hirer' | 'fixer';
  email: string;
  password: string;
  name: string;
  username: string;
  phone: string;
  skills: string[];
  isGoogleCompletion: boolean;
  termsAccepted: boolean;
}>;

function buildSignupBody(overrides: SignupBodyOverrides = {}) {
  return {
    authMethod: 'email',
    role: 'fixer',
    email: 'new-user@example.com',
    password: 'StrongPass1!',
    name: 'Test Fixer',
    username: 'test_fixer',
    phone: '9876543210',
    skills: ['Plumbing', 'Repairs', 'Installation'],
    location: {
      homeAddress: {
        formattedAddress: 'Test Street',
      },
    },
    termsAccepted: true,
    ...overrides,
  };
}

describe('/api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: true });
    (isAuthRedisDegraded as jest.Mock).mockReturnValue(false);
    (hasOTPVerification as jest.Mock).mockResolvedValue(true);
    (consumeOTPVerification as jest.Mock).mockResolvedValue(true);
    (getServerSession as jest.Mock).mockResolvedValue(null);
    (GoogleAuthService.completeProfile as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Profile completed',
    });
    (RegistrationService.registerUser as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Account created',
      user: { id: 'user-1' },
    });

    (ContentValidator.validateContent as jest.Mock).mockResolvedValue({
      isValid: true,
      violations: [],
      suggestions: [],
    });
    (ContentValidator.validateUsername as jest.Mock).mockResolvedValue({
      isValid: true,
      violations: [],
      suggestions: [],
    });
    (ContentValidator.validateSkills as jest.Mock).mockResolvedValue([]);
  });

  it('returns 503 when auth rate limiting is degraded', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: true });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('returns 429 when signup is rate limited', async () => {
    (authSlidingRateLimit as jest.Mock).mockResolvedValue({ success: false, degraded: false });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.message).toContain('Too many');
  });

  it('requires terms acceptance', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody({ termsAccepted: false })),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('accept the terms');
  });

  it('rejects invalid phone numbers', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody({ phone: '12345' })),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('valid phone number');
  });

  it('rejects invalid profile name content', async () => {
    (ContentValidator.validateContent as jest.Mock).mockResolvedValue({
      isValid: false,
      violations: [{ message: 'Invalid name content' }],
      suggestions: ['Remove prohibited terms'],
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid name content');
  });

  it('rejects invalid usernames from the content validator', async () => {
    (ContentValidator.validateUsername as jest.Mock).mockResolvedValue({
      isValid: false,
      violations: [{ message: 'Username contains blocked content' }],
      suggestions: ['Try a different username'],
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Username contains blocked content');
  });

  it('rejects invalid fixer skills from the content validator', async () => {
    (ContentValidator.validateSkills as jest.Mock).mockResolvedValue([
      {
        violations: [{ message: 'Skill contains blocked content' }],
        suggestions: ['Remove unsupported skill'],
      },
    ]);

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Skill contains blocked content');
  });

  it('requires email OTP verification before email signup', async () => {
    (hasOTPVerification as jest.Mock).mockResolvedValue(false);

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toContain('Email verification is required');
  });

  it('fails closed with 503 when OTP verification receipt is unavailable during redis degradation', async () => {
    (hasOTPVerification as jest.Mock).mockResolvedValue(false);
    (isAuthRedisDegraded as jest.Mock).mockReturnValue(true);

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.message).toContain('temporarily unavailable');
  });

  it('requires an authenticated google session for google completion', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(
          buildSignupBody({
            authMethod: 'google',
            isGoogleCompletion: true,
          })
        ),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe('Unauthorized');
  });

  it('rejects google completion for already registered sessions', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'google-user@example.com',
        authMethod: 'google',
        isRegistered: true,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(
          buildSignupBody({
            authMethod: 'google',
            isGoogleCompletion: true,
          })
        ),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toContain('already registered');
  });

  it('rejects google completion when the active session is not a google signup session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'email-user@example.com',
        authMethod: 'email',
        isRegistered: false,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(
          buildSignupBody({
            authMethod: 'google',
            isGoogleCompletion: true,
          })
        ),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.message).toBe('Invalid Google signup session');
  });

  it('completes google signup without requiring signup OTP verification receipts', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'pending_google:google-123',
        email: 'google-user@example.com',
        authMethod: 'google',
        isRegistered: false,
      },
    });
    (GoogleAuthService.completeProfile as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Profile completed',
      user: { id: 'user-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(
          buildSignupBody({
            authMethod: 'google',
            isGoogleCompletion: true,
          })
        ),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(hasOTPVerification).not.toHaveBeenCalled();
    expect(consumeOTPVerification).not.toHaveBeenCalled();
  });

  it('returns 400 when google profile completion fails validation in the service layer', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'pending_google:google-123',
        email: 'google-user@example.com',
        authMethod: 'google',
        isRegistered: false,
      },
    });
    (GoogleAuthService.completeProfile as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Username taken',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(
          buildSignupBody({
            authMethod: 'google',
            isGoogleCompletion: true,
          })
        ),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Username taken');
  });

  it('requires password for email signup', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody({ password: '' })),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Validation failed');
    expect(payload.details?.fieldErrors?.password).toBeDefined();
  });

  it('returns 201 for successful email registration and consumes email OTP verification receipt', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody({ authMethod: 'email' })),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(RegistrationService.registerUser).toHaveBeenCalled();
    expect(hasOTPVerification).toHaveBeenCalledWith('new-user@example.com', 'signup');
    expect(consumeOTPVerification).toHaveBeenCalledWith('new-user@example.com', 'signup');
  });

  it('maps duplicate account errors to 409 conflicts', async () => {
    (RegistrationService.registerUser as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Email already exists',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.success).toBe(false);
  });

  it('keeps non-conflict registration failures as 400 responses', async () => {
    (RegistrationService.registerUser as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Location is required',
    });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(buildSignupBody()),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Location is required');
  });

  it('returns 400 when the request body cannot be parsed', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: '{invalid-json',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.message).toBe('Invalid request body');
  });
});
