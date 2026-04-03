import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';

import ResetPasswordPage from '@/app/auth/reset-password/page';

describe('ResetPasswordPage', () => {
  const replace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace });
  });

  it('redirects to forgot password automatically', () => {
    vi.spyOn(window, 'setTimeout').mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof window.setTimeout);

    render(<ResetPasswordPage />);

    expect(replace).toHaveBeenCalledWith('/auth/forgot-password');
  });

  it('lets the user request a new code immediately', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.click(screen.getByRole('button', { name: /request new code/i }));

    expect(replace).toHaveBeenCalledWith('/auth/forgot-password');
  });
});
