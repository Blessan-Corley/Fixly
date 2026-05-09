import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Help Center — Fixly',
  description: 'Find answers to frequently asked questions and learn how to get the most out of Fixly.',
};

export default function HelpLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
