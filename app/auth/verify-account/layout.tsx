import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Verify Account — Fixly',
  description: 'Verify your Fixly account email and phone number.',
};

export default function VerifyAccountLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
