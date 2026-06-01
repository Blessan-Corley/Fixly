import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Cookie Policy — Fixly',
  description: 'Learn about how Fixly uses cookies and similar technologies on our platform.',
};

export default function CookiesLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
