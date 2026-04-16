import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign In — Fixly',
  description: 'Sign in to your Fixly account to hire local professionals or find work.',
};

export default function SignInLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
