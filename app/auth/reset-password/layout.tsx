import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Reset Password — Fixly',
  description: 'Set a new password for your Fixly account.',
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
