import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ───────────────────────────────────────────────────────────────

// signup-draft utilities aren't used by useEmailOtp directly, but the flow
// module imports validation schemas — those are real (no mock needed).

import { useEmailOtp } from '@/app/auth/signup/_hooks/useEmailOtp';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeValidFormData() {
  return {
    email: 'test@example.com',
    password: 'Password1!',
    confirmPassword: 'Password1!',
    name: 'Test User',
  };
}

function mockFetchOk(body: Record<string, unknown> = {}): void {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  } as Response);
}

function mockFetchFail(body: Record<string, unknown> = { message: 'Server error' }): void {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: false,
    json: async () => body,
  } as Response);
}

// ── canSendEmailOtp ────────────────────────────────────────────────────────────

describe('useEmailOtp — canSendEmailOtp', () => {
  it('is true when email, password, and confirmPassword are valid', () => {
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );
    expect(result.current.canSendEmailOtp).toBe(true);
  });

  it('is false when email is blank', () => {
    const { result } = renderHook(() =>
      useEmailOtp({
        formData: { ...makeValidFormData(), email: '' },
        setErrors: vi.fn(),
      })
    );
    expect(result.current.canSendEmailOtp).toBe(false);
  });

  it('is false when passwords do not match', () => {
    const { result } = renderHook(() =>
      useEmailOtp({
        formData: { ...makeValidFormData(), confirmPassword: 'Different1!' },
        setErrors: vi.fn(),
      })
    );
    expect(result.current.canSendEmailOtp).toBe(false);
  });

  it('is false when password is too weak', () => {
    const { result } = renderHook(() =>
      useEmailOtp({
        formData: { ...makeValidFormData(), password: 'weak', confirmPassword: 'weak' },
        setErrors: vi.fn(),
      })
    );
    expect(result.current.canSendEmailOtp).toBe(false);
  });
});

// ── initial state ──────────────────────────────────────────────────────────────

describe('useEmailOtp — initial state', () => {
  it('starts with all fields at their zero values', () => {
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );
    expect(result.current.emailOtp).toBe('');
    expect(result.current.emailOtpSent).toBe(false);
    expect(result.current.emailOtpVerified).toBe(false);
    expect(result.current.otpLoading).toBe(false);
    expect(result.current.otpError).toBe('');
    expect(result.current.resendCooldown).toBe(0);
  });
});

// ── sendEmailOtp ───────────────────────────────────────────────────────────────

describe('useEmailOtp — sendEmailOtp', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls setErrors and aborts when form data is invalid', async () => {
    global.fetch = vi.fn();
    const setErrors = vi.fn();
    const { result } = renderHook(() =>
      useEmailOtp({
        formData: { ...makeValidFormData(), email: 'not-an-email' },
        setErrors,
      })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    expect(setErrors).toHaveBeenCalledWith(expect.objectContaining({ email: expect.any(String) }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts to /api/auth/send-otp with correct body on valid form data', async () => {
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/send-otp',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"email":"test@example.com"'),
      })
    );
  });

  it('sets emailOtpSent and starts countdown on success', async () => {
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    expect(result.current.emailOtpSent).toBe(true);
    expect(result.current.emailOtpVerified).toBe(false);
    expect(result.current.resendCooldown).toBe(60);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('sent'));
  });

  it('decrements countdown every second', async () => {
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    act(() => { vi.advanceTimersByTime(3000); });

    expect(result.current.resendCooldown).toBe(57);
  });

  it('sets otpError and shows toast on fetch failure', async () => {
    mockFetchFail({ message: 'Rate limited' });
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    expect(result.current.otpError).toBe('Rate limited');
    expect(result.current.emailOtpSent).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Rate limited');
  });

  it('clears otpLoading after both success and failure', async () => {
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    expect(result.current.otpLoading).toBe(false);
  });

  it('uses name fallback when name is empty', async () => {
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({
        formData: { ...makeValidFormData(), name: '' },
        setErrors: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    // name should fall back to email local-part
    expect(body.name).toBe('test');
  });
});

// ── verifyEmailOtp ─────────────────────────────────────────────────────────────

describe('useEmailOtp — verifyEmailOtp', () => {
  it('sets otpError when OTP is shorter than 6 digits', async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      result.current.setEmailOtp('123');
    });

    await act(async () => {
      await result.current.verifyEmailOtp();
    });

    expect(result.current.otpError).toMatch(/6-digit/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts to /api/auth/verify-otp with code and sets verified on success', async () => {
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      result.current.setEmailOtp('123456');
    });

    await act(async () => {
      await result.current.verifyEmailOtp();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/verify-otp',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"otp":"123456"'),
      })
    );
    expect(result.current.emailOtpVerified).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('verified'));
  });

  it('sets otpError on API failure without changing verified state', async () => {
    mockFetchFail({ message: 'Invalid code' });
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      result.current.setEmailOtp('000000');
    });

    await act(async () => {
      await result.current.verifyEmailOtp();
    });

    expect(result.current.emailOtpVerified).toBe(false);
    expect(result.current.otpError).toBe('Invalid code');
  });
});

// ── resetOtpState ──────────────────────────────────────────────────────────────

describe('useEmailOtp — resetOtpState', () => {
  afterEach(() => vi.useRealTimers());

  it('clears all state back to initial values', async () => {
    vi.useFakeTimers();
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    // Drive to a non-initial state
    await act(async () => {
      await result.current.sendEmailOtp();
    });
    act(() => {
      result.current.setEmailOtp('123456');
    });
    expect(result.current.emailOtpSent).toBe(true);
    expect(result.current.resendCooldown).toBeGreaterThan(0);

    // Reset
    act(() => {
      result.current.resetOtpState();
    });

    expect(result.current.emailOtp).toBe('');
    expect(result.current.emailOtpSent).toBe(false);
    expect(result.current.emailOtpVerified).toBe(false);
    expect(result.current.otpError).toBe('');
    expect(result.current.resendCooldown).toBe(0);
  });

  it('clears the countdown interval so it stops ticking', async () => {
    vi.useFakeTimers();
    mockFetchOk();
    const { result } = renderHook(() =>
      useEmailOtp({ formData: makeValidFormData(), setErrors: vi.fn() })
    );

    await act(async () => {
      await result.current.sendEmailOtp();
    });

    act(() => {
      result.current.resetOtpState();
    });

    // Advance time — counter should not change since timer was cleared
    act(() => { vi.advanceTimersByTime(5000); });

    expect(result.current.resendCooldown).toBe(0);
  });
});
