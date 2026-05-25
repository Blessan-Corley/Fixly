import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Privacy Policy — Fixly',
  description: 'Learn how Fixly collects, uses, and protects your personal data in accordance with our privacy policy.',
};

export default function PrivacyLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
