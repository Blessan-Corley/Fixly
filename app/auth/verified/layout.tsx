import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Account Verified — Fixly',
  description: 'Your Fixly account has been successfully verified. You can now sign in.',
};

export default function VerifiedLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
