import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Authentication Error — Fixly',
  description: 'An error occurred during authentication. Please try signing in again.',
};

export default function AuthErrorLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
