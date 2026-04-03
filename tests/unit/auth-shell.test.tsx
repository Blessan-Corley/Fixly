import { render, screen } from '@testing-library/react';

import AuthShell from '@/components/auth/AuthShell';

describe('AuthShell', () => {
  it('renders branding, content, footer, and support links', () => {
    render(
      <AuthShell
        title="Welcome Back"
        subtitle="Sign in to your account"
        badge="Sign In"
        footer={<p>Footer CTA</p>}
      >
        <div>Auth content</div>
      </AuthShell>
    );

    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Auth content')).toBeInTheDocument();
    expect(screen.getByText('Footer CTA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /help/i })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('link', { name: /support/i })).toHaveAttribute('href', '/support');
  });
});
