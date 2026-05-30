import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Resources — Fixly',
  description: 'Guides, tips, and resources to help hirers and fixers get the most out of the Fixly platform.',
};

export default function ResourcesLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
