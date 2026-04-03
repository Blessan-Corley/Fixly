import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(),
  signIn: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('@/components/auth/OtpCodeInput', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label="OTP code"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  ),
}));

vi.mock('@/components/LocationPicker/EnhancedLocationSelector', () => ({
  __esModule: true,
  default: ({
    onLocationSelect,
  }: {
    onLocationSelect: (location: {
      formatted: string;
      formattedAddress: string;
      coordinates: { lat: number; lng: number };
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onLocationSelect({
          formatted: 'Test Street',
          formattedAddress: 'Test Street',
          coordinates: { lat: 12.34, lng: 56.78 },
        })
      }
    >
      Use test location
    </button>
  ),
}));

vi.mock('@/components/SkillSelector/SkillSelector', () => ({
  __esModule: true,
  default: ({ onSkillsChange }: { onSkillsChange: (skills: string[]) => void }) => (
    <button type="button" onClick={() => onSkillsChange(['Plumbing', 'Repairs', 'Wiring'])}>
      Add sample skills
    </button>
  ),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn, useSession } from 'next-auth/react';

import SignupPage from '@/app/auth/signup/page';

describe('SignupPage', () => {
  const push = vi.fn();
  const replace = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push, replace } as never);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as never);
    vi.mocked(getSession).mockResolvedValue(null);
    vi.mocked(useSession).mockReturnValue({ data: null, update: vi.fn() } as never);
    vi.mocked(signIn).mockResolvedValue({ ok: true } as never);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('requires a role and auth method before continuing', async () => {
    render(<SignupPage />);

    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
  });

  it('shows role selection choices on the first step', () => {
    render(<SignupPage />);

    expect(screen.getByRole('button', { name: /join as hirer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join as fixer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with email/i })).toBeInTheDocument();
  });

  it('completes the email signup flow and signs the user in', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: {
            id: 'user-1',
            role: 'fixer',
            username: 'new_user',
            isVerified: true,
          },
        }),
      });

    render(<SignupPage />);

    await user.click(screen.getByRole('button', { name: /join as fixer/i }));
    await user.click(screen.getByRole('button', { name: /continue with email/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'Person@Example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /send code/i }));

    expect(await screen.findByText(/code sent to/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/send-otp',
      expect.objectContaining({ method: 'POST' })
    );

    await user.type(screen.getByLabelText('OTP code'), '123456');
    await user.click(screen.getByRole('button', { name: /verify email/i }));

    expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await user.type(screen.getByRole('textbox', { name: /full name/i }), 'Person Example');
    await user.type(screen.getByRole('textbox', { name: /username/i }), 'new_user');
    await user.type(screen.getByRole('textbox', { name: /phone number/i }), '9876543210');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await user.click(await screen.findByRole('button', { name: /use test location/i }));
    await user.click(await screen.findByRole('button', { name: /add sample skills/i }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        '/api/auth/signup',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    const signupRequest = fetchMock.mock.calls[2]?.[1] as { body?: string };
    const signupPayload = JSON.parse(signupRequest.body || '{}') as {
      role?: string;
      authMethod?: string;
      email?: string;
      username?: string;
      phone?: string;
      skills?: string[];
    };

    expect(signupPayload.role).toBe('fixer');
    expect(signupPayload.authMethod).toBe('email');
    expect(signupPayload.email).toBe('Person@Example.com');
    expect(signupPayload.username).toBe('new_user');
    expect(signupPayload.phone).toBe('9876543210');
    expect(signupPayload.skills).toEqual(['Plumbing', 'Repairs', 'Wiring']);

    expect(signIn).toHaveBeenCalledWith('credentials', {
      identifier: 'Person@Example.com',
      password: 'StrongPass1!',
      loginMethod: 'credentials',
      callbackUrl: '/dashboard',
    });
  });
});

