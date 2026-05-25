import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Create Account — Fixly',
  description: 'Join Fixly to hire trusted local professionals or offer your services.',
};

export default function SignUpLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
