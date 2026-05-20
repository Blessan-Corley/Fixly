import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Module mocks ───────────────────────────────────────────────────────────────

const mockReadSignupDraft = vi.fn();
const mockWriteSignupDraft = vi.fn();
const mockClearSignupDraft = vi.fn();
const mockHasSignupDraftContent = vi.fn((_draft: unknown) => false);

vi.mock('@/lib/signup-draft', () => ({
  readSignupDraft: () => mockReadSignupDraft(),
  writeSignupDraft: (draft: unknown) => mockWriteSignupDraft(draft),
  clearSignupDraft: () => mockClearSignupDraft(),
  hasSignupDraftContent: (draft: unknown) => mockHasSignupDraftContent(draft),
}));

import { useSignupDraft } from '@/app/auth/signup/_hooks/useSignupDraft';
import type { SignupFlowState, SignupFormData } from '@/app/auth/signup/_lib/signup.types';
import type { UserRole } from '@/types/User';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<SignupFormData> = {}): SignupFormData {
  return {
    role: 'hirer',
    authMethod: 'email',
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: null,
    skills: [],
    termsAccepted: false,
    ...overrides,
  };
}

function makeInitialFormData(role?: UserRole): SignupFormData {
  return makeFormData({ role });
}

function makeDraftOptions(
  overrides: Partial<Parameters<typeof useSignupDraft>[0]> = {}
): Parameters<typeof useSignupDraft>[0] {
  return {
    formData: makeFormData(),
    currentStep: 'role' as SignupFlowState['currentStep'],
    initialRole: undefined,
    dispatch: vi.fn(),
    initialFormData: makeInitialFormData,
    ...overrides,
  };
}

// ── hasCheckedSession ──────────────────────────────────────────────────────────

describe('useSignupDraft — hasCheckedSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSignupDraft.mockReturnValue(null);
  });

  it('is true after the session check effect has completed', async () => {
    const { result } = renderHook(() => useSignupDraft(makeDraftOptions()));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.hasCheckedSession).toBe(true);
  });
});

// ── No session + no draft ──────────────────────────────────────────────────────

describe('useSignupDraft — no session, no draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSignupDraft.mockReturnValue(null);
  });

  it('does not dispatch when there is no session and no draft', async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useSignupDraft(makeDraftOptions({ dispatch })));

    await act(async () => { await Promise.resolve(); });

    // Confirm session check ran
    expect(result.current.hasCheckedSession).toBe(true);
    // No draft content → no HYDRATE dispatched
    expect(dispatch).not.toHaveBeenCalled();
  });
});

// ── No session + existing draft ────────────────────────────────────────────────

describe('useSignupDraft — no session, with draft', () => {
  beforeEach(() => vi.clearAllMocks());

  it('dispatches HYDRATE restoring the draft when no session is present', async () => {
    mockReadSignupDraft.mockReturnValue({
      version: 1,
      authMethod: 'email',
      currentStep: 3,
      updatedAt: Date.now(),
      formData: {
        role: 'fixer',
        name: 'Alice',
        username: 'alice',
        email: 'alice@example.com',
        phone: '',
        address: null,
        skills: ['plumbing'],
        termsAccepted: false,
      },
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() => useSignupDraft(makeDraftOptions({ dispatch })));

    await act(async () => { await Promise.resolve(); });

    expect(result.current.hasCheckedSession).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HYDRATE',
        state: expect.objectContaining({
          formData: expect.objectContaining({
            role: 'fixer',
            name: 'Alice',
            email: 'alice@example.com',
          }),
        }),
      })
    );
  });

  it('resets email-auth draft at step > 2 back to account step and shows info toast', async () => {
    mockReadSignupDraft.mockReturnValue({
      version: 1,
      authMethod: 'email',
      currentStep: 3,  // step 3 = profile, > 2
      updatedAt: Date.now(),
      formData: {
        role: 'hirer',
        name: 'Bob',
        username: 'bob',
        email: 'bob@example.com',
        phone: '',
        address: null,
        skills: [],
        termsAccepted: false,
      },
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() => useSignupDraft(makeDraftOptions({ dispatch })));

    await act(async () => { await Promise.resolve(); });

    expect(result.current.hasCheckedSession).toBe(true);
    // Step should be reset to 'account' for email auth at step > 2
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({ currentStep: 'account' }),
      })
    );
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining('Re-enter your password')
    );
  });
});

// ── Registered user session → redirect ────────────────────────────────────────

describe('useSignupDraft — registered user session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSignupDraft.mockReturnValue(null);
  });

  it('redirects to /dashboard and clears draft when user is fully registered', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        user: {
          id: 'uid1',
          email: 'reg@example.com',
          isRegistered: true,
          role: 'hirer',
          username: 'registered_user',
          authMethod: 'email',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const { useRouter } = await import('next/navigation');
    const mockReplace = vi.fn();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: vi.fn(),
      replace: mockReplace,
      prefetch: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() => useSignupDraft(makeDraftOptions({ dispatch })));

    await act(async () => { await Promise.resolve(); });

    expect(result.current.hasCheckedSession).toBe(true);
    expect(mockClearSignupDraft).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    expect(dispatch).not.toHaveBeenCalled();
  });
});

// ── Google OAuth session → HYDRATE ────────────────────────────────────────────

describe('useSignupDraft — Google OAuth session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSignupDraft.mockReturnValue(null);
  });

  it('dispatches HYDRATE with Google user data from session', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        user: {
          id: 'pending_google:gid123',
          email: 'google.user@gmail.com',
          name: 'Google User',
          image: 'https://example.com/avatar.png',
          authMethod: 'google',
          isRegistered: false,
          username: undefined,
          role: undefined,
          phone: '',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useSignupDraft(makeDraftOptions({ dispatch, initialRole: 'fixer' }))
    );

    await act(async () => { await Promise.resolve(); });

    expect(result.current.hasCheckedSession).toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HYDRATE',
        state: expect.objectContaining({
          currentStep: 'profile',
          formData: expect.objectContaining({
            authMethod: 'google',
            email: 'google.user@gmail.com',
            name: 'Google User',
          }),
        }),
      })
    );
  });

  it('uses username from session if not a temp username', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        user: {
          id: 'pending_google:gid456',
          email: 'g2@gmail.com',
          name: 'G2',
          authMethod: 'google',
          isRegistered: false,
          username: 'realusername',
          phone: '',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useSignupDraft(makeDraftOptions({ dispatch }))
    );

    await act(async () => { await Promise.resolve(); });

    const hydrateCall = (dispatch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(hydrateCall.state.formData.username).toBe('realusername');
  });

  it('falls back to email-derived username when session username is a temp username', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        user: {
          id: 'pending_google:gid789',
          email: 'my.email@gmail.com',
          name: 'My Name',
          authMethod: 'google',
          isRegistered: false,
          username: 'tmp_abc123',  // temporary username — should be replaced
          phone: '',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const dispatch = vi.fn();
    const { result } = renderHook(() =>
      useSignupDraft(makeDraftOptions({ dispatch }))
    );

    await act(async () => { await Promise.resolve(); });

    const hydrateCall = (dispatch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // Fallback: email local-part, lowercased, sanitised, max 20 chars
    expect(hydrateCall.state.formData.username).toBe('myemail');
  });
});

// ── Draft persistence via useEffect ───────────────────────────────────────────

describe('useSignupDraft — draft persistence after check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSignupDraft.mockReturnValue(null);
  });

  it('writes draft after hasCheckedSession becomes true and form has content', async () => {
    mockHasSignupDraftContent.mockReturnValue(true);

    const { result, rerender } = renderHook(
      (props: Parameters<typeof useSignupDraft>[0]) => useSignupDraft(props),
      { initialProps: makeDraftOptions({ formData: makeFormData({ email: 'a@b.com' }) }) }
    );

    await act(async () => { await Promise.resolve(); });

    expect(result.current.hasCheckedSession).toBe(true);
    expect(mockWriteSignupDraft).toHaveBeenCalled();
  });

  it('clears draft when form has no meaningful content', async () => {
    mockHasSignupDraftContent.mockReturnValue(false);

    const { result } = renderHook(() =>
      useSignupDraft(makeDraftOptions({ formData: makeFormData() }))
    );

    await act(async () => { await Promise.resolve(); });

    expect(result.current.hasCheckedSession).toBe(true);
    expect(mockClearSignupDraft).toHaveBeenCalled();
  });
});
