import { act, renderHook } from '@testing-library/react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('@/lib/signup-draft', () => ({
  clearSignupDraft: vi.fn(),
  writeSignupDraft: vi.fn(),
  hasSignupDraftContent: vi.fn(() => false),
  readSignupDraft: vi.fn(() => null),
}));

import { useSignupSubmit } from '@/app/auth/signup/_hooks/useSignupSubmit';
import type { SignupFormData } from '@/app/auth/signup/_lib/signup.types';
import { clearSignupDraft, writeSignupDraft } from '@/lib/signup-draft';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<SignupFormData> = {}): SignupFormData {
  return {
    role: 'hirer',
    authMethod: 'email',
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    phone: '+919876543210',
    password: 'Password1!',
    confirmPassword: 'Password1!',
    address: { formattedAddress: '123 Main St', coordinates: { lat: 0, lng: 0 } },
    skills: [],
    termsAccepted: true,
    ...overrides,
  };
}

function mockFetchSignupOk(user = { id: 'uid1', role: 'hirer', username: 'testuser', isVerified: true }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, user }),
  } as Response);
}

function mockFetchSignupFail(message = 'Email already in use') {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, message }),
  } as Response);
}

function makeOptions(overrides: Partial<Parameters<typeof useSignupSubmit>[0]> = {}) {
  return {
    formData: makeFormData(),
    currentStep: 'verification' as const,
    errors: {},
    postSignupRedirect: '/dashboard',
    setErrors: vi.fn(),
    setLoading: vi.fn(),
    validateCurrentStep: vi.fn(() => true),
    ...overrides,
  };
}

// ── handleGoogleAuth ───────────────────────────────────────────────────────────

describe('useSignupSubmit — handleGoogleAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets role error and returns early when no role is selected', async () => {
    const setErrors = vi.fn();
    const { result } = renderHook(() =>
      useSignupSubmit(makeOptions({ formData: makeFormData({ role: undefined }), setErrors }))
    );

    await act(async () => {
      await result.current.handleGoogleAuth();
    });

    expect(setErrors).toHaveBeenCalledWith(
      expect.objectContaining({ role: expect.any(String) })
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it('calls set-context then signIn("google") when role is present', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const setLoading = vi.fn();
    const { result } = renderHook(() =>
      useSignupSubmit(makeOptions({ setLoading }))
    );

    await act(async () => {
      await result.current.handleGoogleAuth();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/set-context',
      expect.objectContaining({ method: 'POST' })
    );
    expect(signIn).toHaveBeenCalledWith('google', expect.objectContaining({ callbackUrl: expect.stringContaining('role=hirer') }));
    expect(setLoading).toHaveBeenCalledWith(true);
  });

  it('shows toast and clears loading on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    const setLoading = vi.fn();
    const { result } = renderHook(() =>
      useSignupSubmit(makeOptions({ setLoading }))
    );

    await act(async () => {
      await result.current.handleGoogleAuth();
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('authentication failed'));
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('writes signup draft before initiating Google auth', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const { result } = renderHook(() => useSignupSubmit(makeOptions()));

    await act(async () => {
      await result.current.handleGoogleAuth();
    });

    expect(writeSignupDraft).toHaveBeenCalled();
  });
});

// ── submitSignup — validation ──────────────────────────────────────────────────

describe('useSignupSubmit — submitSignup validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns early without fetching when validateCurrentStep returns false', async () => {
    global.fetch = vi.fn();
    const validateCurrentStep = vi.fn(() => false);
    const { result } = renderHook(() =>
      useSignupSubmit(makeOptions({ validateCurrentStep }))
    );

    await act(async () => {
      await result.current.submitSignup();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(validateCurrentStep).toHaveBeenCalledWith('verification');
  });
});

// ── submitSignup — email flow ──────────────────────────────────────────────────

describe('useSignupSubmit — submitSignup email flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts to /api/auth/signup with correct shape', async () => {
    mockFetchSignupOk();
    const { result } = renderHook(() => useSignupSubmit(makeOptions()));

    await act(async () => {
      await result.current.submitSignup();
    });

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/signup');
    const body = JSON.parse(init.body as string);
    expect(body.isGoogleCompletion).toBe(false);
    expect(body.email).toBe('test@example.com');
  });

  it('calls signIn("credentials") after successful email signup', async () => {
    mockFetchSignupOk();
    const { result } = renderHook(() =>
      useSignupSubmit(makeOptions({ formData: makeFormData({ authMethod: 'email' }) }))
    );

    await act(async () => {
      await result.current.submitSignup();
    });

    expect(signIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({ identifier: 'test@example.com', callbackUrl: '/dashboard' })
    );
    expect(clearSignupDraft).toHaveBeenCalled();
  });

  it('shows toast error and does not call signIn when API returns error message', async () => {
    mockFetchSignupFail('Email already in use');
    const { result } = renderHook(() => useSignupSubmit(makeOptions()));

    await act(async () => {
      await result.current.submitSignup();
    });

    expect(toast.error).toHaveBeenCalledWith('Email already in use');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows toast error on network exception', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network down'));
    const { result } = renderHook(() => useSignupSubmit(makeOptions()));

    await act(async () => {
      await result.current.submitSignup();
    });

    expect(toast.error).toHaveBeenCalledWith('Network down');
  });

  it('always clears loading in finally block', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('fail'));
    const setLoading = vi.fn();
    const { result } = renderHook(() => useSignupSubmit(makeOptions({ setLoading })));

    await act(async () => {
      await result.current.submitSignup();
    });

    expect(setLoading).toHaveBeenLastCalledWith(false);
  });
});

// ── submitSignup — Google completion flow ──────────────────────────────────────

describe('useSignupSubmit — submitSignup Google completion flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls session.update (not signIn) for Google auth method', async () => {
    const { useSession } = await import('next-auth/react');
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        user: {
          id: 'pending_google:gid123',
          email: 'google@example.com',
          name: 'Google User',
          authMethod: 'google',
          isRegistered: false,
        },
      },
      status: 'authenticated',
      update: mockUpdate,
    });

    mockFetchSignupOk({ id: 'uid2', role: 'hirer', username: 'googleuser', isVerified: true });

    const { result } = renderHook(() =>
      useSignupSubmit(
        makeOptions({
          formData: makeFormData({ authMethod: 'google', role: 'hirer', username: 'googleuser' }),
        })
      )
    );

    await act(async () => {
      await result.current.submitSignup();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          isRegistered: true,
          authMethod: 'google',
        }),
      })
    );
    expect(signIn).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('ready'));
  });

  it('skips session.update when session.user is null', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    mockFetchSignupOk();

    const { result } = renderHook(() =>
      useSignupSubmit(
        makeOptions({ formData: makeFormData({ authMethod: 'google' }) })
      )
    );

    await act(async () => {
      await result.current.submitSignup();
    });

    // Should not throw and should not call signIn (Google path, no session)
    expect(signIn).not.toHaveBeenCalled();
  });
});
