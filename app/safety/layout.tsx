import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Safety Guidelines — Fixly',
  description: 'Fixly safety guidelines for hirers and fixers — how we keep our marketplace safe and trustworthy.',
};

export default function SafetyLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
