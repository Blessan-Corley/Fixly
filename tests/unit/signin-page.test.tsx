import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('nuqs', () => {
  const parseAsString = {
    withDefault(defaultValue: string) {
      return { defaultValue };
    },
  };

  return {
    parseAsString,
    useQueryState: vi.fn(),
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import { useQueryState } from 'nuqs';

import SignInPage from '@/app/auth/signin/page';

describe('SignInPage', () => {
  const push = vi.fn();
  const replace = vi.fn();
  const mockUseQueryState = vi.mocked(useQueryState);

  function mockQueryState(values: Record<string, string | null>) {
    mockUseQueryState.mockImplementation((key: string, parser?: { defaultValue?: string }) => [
      values[key] ?? parser?.defaultValue ?? null,
      vi.fn(),
    ]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push, replace } as never);
    mockQueryState({
      role: 'hirer',
      email: 'person@example.com',
      error: null,
      message: null,
    });
    vi.mocked(getSession).mockResolvedValue(null);
    vi.mocked(signIn).mockResolvedValue({ ok: true } as never);
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.clear(screen.getByRole('textbox', { name: /email or username/i }));
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(screen.getByText('Enter your email address or username')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('submits email or username credentials and routes to the dashboard on success', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.clear(screen.getByRole('textbox', { name: /email or username/i }));
    await user.type(
      screen.getByRole('textbox', { name: /email or username/i }),
      'User@Example.com'
    );
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        identifier: 'user@example.com',
        password: 'StrongPass1!',
        loginMethod: 'credentials',
        redirect: false,
      });
    });
    expect(push).toHaveBeenCalledWith('/dashboard');
  });

  it('routes to signup with the current role from the footer action', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    await user.click(screen.getByRole('button', { name: /create a new account/i }));

    expect(push).toHaveBeenCalledWith('/auth/signup?role=hirer');
  });
});
