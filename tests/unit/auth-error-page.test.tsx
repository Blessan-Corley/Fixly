import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
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

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';

import AuthErrorPage from '@/app/auth/error/page';

describe('AuthErrorPage', () => {
  const push = vi.fn();
  const mockUseQueryState = vi.mocked(useQueryState);

  function mockQueryState(values: Record<string, string | null>) {
    mockUseQueryState.mockImplementation((key: string) => [values[key] ?? null, vi.fn()]);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push } as never);
  });

  it('shows the account-not-found path with signup CTA', async () => {
    const user = userEvent.setup();
    mockQueryState({
      error: 'AccountNotFound',
      email: 'person@example.com',
      name: 'Person',
      message: null,
    });

    render(<AuthErrorPage />);

    expect(
      screen.getByRole('heading', { name: /we couldn't find your fixly account/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/this google account is not registered with fixly yet/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create new account/i }));

    expect(push).toHaveBeenCalledWith(
      '/auth/signup?method=google&email=person%40example.com&name=Person'
    );
  });

  it('shows the use-email-signin path and routes back to sign in', async () => {
    const user = userEvent.setup();
    mockQueryState({
      error: 'UseEmailSignIn',
      email: 'person@example.com',
      name: null,
      message: null,
    });

    render(<AuthErrorPage />);

    expect(
      screen.getByRole('heading', { name: /use email sign-in for this account/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /go to sign in/i }));

    expect(push).toHaveBeenCalledWith('/auth/signin?email=person%40example.com');
  });
});
