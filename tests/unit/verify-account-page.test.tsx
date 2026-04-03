import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/components/auth/FirebasePhoneAuth', () => ({
  __esModule: true,
  default: ({ onVerificationComplete }: { onVerificationComplete: (data: unknown) => void }) => (
    <button type="button" onClick={() => onVerificationComplete({ user: { isVerified: true } })}>
      Complete phone verification
    </button>
  ),
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
      aria-label="Email OTP"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  ),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import VerifyAccountPage from '@/app/auth/verify-account/page';

describe('VerifyAccountPage', () => {
  const push = vi.fn();
  const update = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('redirects unauthenticated users to sign in', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update,
    });

    render(<VerifyAccountPage />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/auth/signin');
    });
  });

  it('sends and verifies the email OTP for an authenticated user', async () => {
    const user = userEvent.setup();
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: 'person@example.com',
          phone: '9876543210',
          emailVerified: false,
          phoneVerified: false,
        },
      },
      status: 'authenticated',
      update,
    });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Verification code sent' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user: { isVerified: false } }),
      });

    render(<VerifyAccountPage />);

    await user.click(screen.getByRole('button', { name: /send email otp/i }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/send-otp',
      expect.objectContaining({ method: 'POST' })
    );

    await user.type(screen.getByLabelText(/email otp/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify email/i }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/verify-otp',
      expect.objectContaining({ method: 'POST' })
    );
    await waitFor(() => {
      expect(update).toHaveBeenCalled();
    });
    expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
  });
});
