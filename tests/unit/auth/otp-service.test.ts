import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockOtpStorageStore = vi.fn();
const mockOtpStorageVerify = vi.fn();
const mockOtpStorageConsumeVerification = vi.fn();
const mockOtpStorageHasVerification = vi.fn();
const mockOtpStorageCheckStatus = vi.fn();

let inMemoryFallbackEnabled = true;

vi.mock('@/lib/otp/storage', () => ({
  OTP_EXPIRY_TIME_SECONDS: 300,
  OTP_SERVICE_UNAVAILABLE_MESSAGE: 'Verification service temporarily unavailable. Please try again shortly.',
  canUseInMemoryFallback: () => inMemoryFallbackEnabled,
  otpStorage: {
    store: (...args: unknown[]) => mockOtpStorageStore(...args),
    verify: (...args: unknown[]) => mockOtpStorageVerify(...args),
    consumeVerification: (...args: unknown[]) => mockOtpStorageConsumeVerification(...args),
    hasVerification: (...args: unknown[]) => mockOtpStorageHasVerification(...args),
    checkStatus: (...args: unknown[]) => mockOtpStorageCheckStatus(...args),
  },
}));

const mockSendOtpEmail = vi.fn();
vi.mock('@/lib/services/emailService', () => ({
  sendOtpEmail: (...args: unknown[]) => mockSendOtpEmail(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXTAUTH_SECRET: 'test-secret',
    AUTH_SECRET: undefined,
    NODE_ENV: 'test',
  },
}));

import { AppError } from '@/lib/api/errors';
import {
  checkOTPStatus,
  consumeOTPVerification,
  hasOTPVerification,
  sendPasswordResetOTP,
  sendSignupOTP,
  storeOTP,
  verifyOTP,
} from '@/lib/otp/service';

// ── storeOTP ───────────────────────────────────────────────────────────────────

describe('storeOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('returns success when storage succeeds', async () => {
    mockOtpStorageStore.mockResolvedValue(true);
    const result = await storeOTP('user@test.com', '123456');
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/stored/i);
  });

  it('uses default purpose "verification"', async () => {
    mockOtpStorageStore.mockResolvedValue(true);
    await storeOTP('user@test.com', '123456');
    expect(mockOtpStorageStore).toHaveBeenCalledWith(
      'user@test.com',
      '123456',
      'verification',
      300
    );
  });

  it('accepts a custom purpose', async () => {
    mockOtpStorageStore.mockResolvedValue(true);
    await storeOTP('user@test.com', '123456', 'signup');
    expect(mockOtpStorageStore).toHaveBeenCalledWith(
      'user@test.com',
      '123456',
      'signup',
      300
    );
  });

  it('returns failure with service unavailable when storage returns false and fallback disabled', async () => {
    inMemoryFallbackEnabled = false;
    mockOtpStorageStore.mockResolvedValue(false);
    const result = await storeOTP('user@test.com', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unavailable/i);
  });

  it('returns failure with generic message when storage returns false and fallback enabled', async () => {
    inMemoryFallbackEnabled = true;
    mockOtpStorageStore.mockResolvedValue(false);
    const result = await storeOTP('user@test.com', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/failed/i);
  });

  it('re-throws AppError from storage', async () => {
    mockOtpStorageStore.mockRejectedValue(new AppError('STORAGE_ERROR', 'storage broken', 500));
    await expect(storeOTP('user@test.com', '123456')).rejects.toThrow(AppError);
  });

  it('returns service unavailable on generic error when fallback disabled', async () => {
    inMemoryFallbackEnabled = false;
    mockOtpStorageStore.mockRejectedValue(new Error('Redis down'));
    const result = await storeOTP('user@test.com', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unavailable/i);
  });

  it('returns error message on generic error when fallback enabled', async () => {
    inMemoryFallbackEnabled = true;
    mockOtpStorageStore.mockRejectedValue(new Error('disk full'));
    const result = await storeOTP('user@test.com', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/error/i);
  });
});

// ── verifyOTP ──────────────────────────────────────────────────────────────────

describe('verifyOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('delegates to storage.verify and returns success', async () => {
    mockOtpStorageVerify.mockResolvedValue({ success: true, message: 'OTP verified successfully' });
    const result = await verifyOTP('user@test.com', '123456');
    expect(result.success).toBe(true);
    expect(mockOtpStorageVerify).toHaveBeenCalledWith('user@test.com', '123456', 'verification');
  });

  it('uses default purpose "verification"', async () => {
    mockOtpStorageVerify.mockResolvedValue({ success: false, message: 'Invalid OTP' });
    await verifyOTP('user@test.com', '000000');
    expect(mockOtpStorageVerify).toHaveBeenCalledWith('user@test.com', '000000', 'verification');
  });

  it('accepts a custom purpose', async () => {
    mockOtpStorageVerify.mockResolvedValue({ success: true, message: 'OK' });
    await verifyOTP('user@test.com', '111111', 'password_reset');
    expect(mockOtpStorageVerify).toHaveBeenCalledWith('user@test.com', '111111', 'password_reset');
  });

  it('re-throws AppError from storage', async () => {
    mockOtpStorageVerify.mockRejectedValue(new AppError('VERIFY_ERROR', 'failed', 500));
    await expect(verifyOTP('user@test.com', '123456')).rejects.toThrow(AppError);
  });

  it('returns unavailable on generic error when fallback disabled', async () => {
    inMemoryFallbackEnabled = false;
    mockOtpStorageVerify.mockRejectedValue(new Error('network error'));
    const result = await verifyOTP('user@test.com', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unavailable/i);
  });

  it('returns generic error message when fallback enabled', async () => {
    inMemoryFallbackEnabled = true;
    mockOtpStorageVerify.mockRejectedValue(new Error('unexpected'));
    const result = await verifyOTP('user@test.com', '123456');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/error|try again/i);
  });
});

// ── consumeOTPVerification ─────────────────────────────────────────────────────

describe('consumeOTPVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('returns true on successful consumption', async () => {
    mockOtpStorageConsumeVerification.mockResolvedValue(true);
    expect(await consumeOTPVerification('user@test.com')).toBe(true);
  });

  it('returns false when no verification exists', async () => {
    mockOtpStorageConsumeVerification.mockResolvedValue(false);
    expect(await consumeOTPVerification('user@test.com')).toBe(false);
  });

  it('uses default purpose "verification"', async () => {
    mockOtpStorageConsumeVerification.mockResolvedValue(true);
    await consumeOTPVerification('user@test.com');
    expect(mockOtpStorageConsumeVerification).toHaveBeenCalledWith('user@test.com', 'verification');
  });

  it('re-throws AppError', async () => {
    mockOtpStorageConsumeVerification.mockRejectedValue(
      new AppError('ERR', 'broken', 500)
    );
    await expect(consumeOTPVerification('user@test.com')).rejects.toThrow(AppError);
  });

  it('returns false on generic error', async () => {
    mockOtpStorageConsumeVerification.mockRejectedValue(new Error('redis timeout'));
    expect(await consumeOTPVerification('user@test.com')).toBe(false);
  });
});

// ── hasOTPVerification ─────────────────────────────────────────────────────────

describe('hasOTPVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when receipt exists', async () => {
    mockOtpStorageHasVerification.mockResolvedValue(true);
    expect(await hasOTPVerification('user@test.com')).toBe(true);
  });

  it('returns false when no receipt', async () => {
    mockOtpStorageHasVerification.mockResolvedValue(false);
    expect(await hasOTPVerification('user@test.com')).toBe(false);
  });

  it('returns false on error', async () => {
    mockOtpStorageHasVerification.mockRejectedValue(new Error('fail'));
    expect(await hasOTPVerification('user@test.com')).toBe(false);
  });
});

// ── sendSignupOTP ──────────────────────────────────────────────────────────────

describe('sendSignupOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('generates and stores OTP when none provided, then sends email', async () => {
    mockOtpStorageStore.mockResolvedValue(true);
    mockSendOtpEmail.mockResolvedValue(undefined);

    const result = await sendSignupOTP('user@test.com', 'Test User');
    expect(result.success).toBe(true);
    expect(result.expiresIn).toBe(300);
    expect(mockOtpStorageStore).toHaveBeenCalledTimes(1);
    expect(mockSendOtpEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(String),
      'signup'
    );
  });

  it('skips storage when OTP is pre-generated and provided', async () => {
    mockSendOtpEmail.mockResolvedValue(undefined);

    const result = await sendSignupOTP('user@test.com', 'Test User', '999999');
    expect(result.success).toBe(true);
    expect(mockOtpStorageStore).not.toHaveBeenCalled();
    expect(mockSendOtpEmail).toHaveBeenCalledWith('user@test.com', '999999', 'signup');
  });

  it('returns failure when storage fails', async () => {
    mockOtpStorageStore.mockResolvedValue(false);

    const result = await sendSignupOTP('user@test.com', 'Test User');
    expect(result.success).toBe(false);
    expect(mockSendOtpEmail).not.toHaveBeenCalled();
  });

  it('returns service unavailable when fallback disabled and error occurs', async () => {
    inMemoryFallbackEnabled = false;
    mockOtpStorageStore.mockRejectedValue(new Error('Redis down'));

    const result = await sendSignupOTP('user@test.com', 'Test User');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unavailable/i);
  });

  it('re-throws AppError', async () => {
    mockOtpStorageStore.mockRejectedValue(new AppError('E', 'bad', 500));
    await expect(sendSignupOTP('user@test.com', 'Test')).rejects.toThrow(AppError);
  });

  it('returns generic failure when fallback enabled and error occurs', async () => {
    inMemoryFallbackEnabled = true;
    mockOtpStorageStore.mockRejectedValue(new Error('unknown'));

    const result = await sendSignupOTP('user@test.com', 'Test User');
    expect(result.success).toBe(false);
    // storeOTP catches the error and returns its own message; sendSignupOTP passes it through
    expect(result.message).toBeTruthy();
  });
});

// ── sendPasswordResetOTP ───────────────────────────────────────────────────────

describe('sendPasswordResetOTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryFallbackEnabled = true;
  });

  it('generates a fresh OTP, stores it, and sends email', async () => {
    mockOtpStorageStore.mockResolvedValue(true);
    mockSendOtpEmail.mockResolvedValue(undefined);

    const result = await sendPasswordResetOTP('user@test.com', 'Test User');
    expect(result.success).toBe(true);
    expect(result.expiresIn).toBe(300);
    expect(mockOtpStorageStore).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(String),
      'password_reset',
      300
    );
    expect(mockSendOtpEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(String),
      'password_reset'
    );
  });

  it('returns failure when store fails', async () => {
    mockOtpStorageStore.mockResolvedValue(false);

    const result = await sendPasswordResetOTP('user@test.com', 'Test User');
    expect(result.success).toBe(false);
    expect(mockSendOtpEmail).not.toHaveBeenCalled();
  });

  it('re-throws AppError', async () => {
    mockOtpStorageStore.mockRejectedValue(new AppError('E', 'storage', 500));
    await expect(sendPasswordResetOTP('user@test.com', 'Test')).rejects.toThrow(AppError);
  });

  it('returns failure when storage reports unavailability', async () => {
    inMemoryFallbackEnabled = false;
    // storeOTP returns {success:false} when store fails; sendPasswordResetOTP
    // hardcodes 'Failed to store OTP' when storeResult.success is false
    mockOtpStorageStore.mockRejectedValue(new Error('network error'));

    const result = await sendPasswordResetOTP('user@test.com', 'Test User');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Failed to store OTP/i);
  });
});

// ── checkOTPStatus ─────────────────────────────────────────────────────────────

describe('checkOTPStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status from storage', async () => {
    mockOtpStorageCheckStatus.mockResolvedValue({ exists: true, expired: false });
    const status = await checkOTPStatus('user@test.com');
    expect(status.exists).toBe(true);
    expect(status.expired).toBe(false);
  });

  it('returns not-exists, expired on error', async () => {
    mockOtpStorageCheckStatus.mockRejectedValue(new Error('fail'));
    const status = await checkOTPStatus('user@test.com');
    expect(status.exists).toBe(false);
    expect(status.expired).toBe(true);
  });

  it('re-throws AppError', async () => {
    mockOtpStorageCheckStatus.mockRejectedValue(new AppError('E', 'err', 500));
    await expect(checkOTPStatus('user@test.com')).rejects.toThrow(AppError);
  });

  it('uses default purpose "verification"', async () => {
    mockOtpStorageCheckStatus.mockResolvedValue({ exists: false, expired: true });
    await checkOTPStatus('user@test.com');
    expect(mockOtpStorageCheckStatus).toHaveBeenCalledWith('user@test.com', 'verification');
  });
});
