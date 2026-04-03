import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
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

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';

import ForgotPasswordPage from '@/app/auth/forgot-password/page';

describe('ForgotPasswordPage', () => {
  const push = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('validates the email field before requesting a reset code', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /send reset code/i }));

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('completes the reset flow with OTP verification and password update', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, expiresIn: 300 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<ForgotPasswordPage />);

    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'User@Example.com');
    await user.click(screen.getByRole('button', { name: /send reset code/i }));

    expect(await screen.findByRole('heading', { name: /verify reset code/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/auth/forgot-password',
      expect.objectContaining({
        method: 'POST',
      })
    );

    await user.type(screen.getByLabelText('OTP code'), '123456');
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    expect(
      await screen.findByText(/your email has been verified\. set your new password below\./i)
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password$/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        '/api/auth/reset-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'user@example.com',
            newPassword: 'StrongPass1!',
            otp: '123456',
          }),
        })
      );
    });
    expect(push).toHaveBeenCalledWith('/auth/signin?message=password_reset_success');
  });
});
