import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Terms of Service — Fixly',
  description: 'Read the Fixly terms of service governing your use of the platform as a hirer or fixer.',
};

export default function TermsLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
