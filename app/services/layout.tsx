import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Services — Fixly',
  description: 'Browse all available service categories on Fixly — from plumbing and electrical to cleaning and carpentry.',
};

export default function ServicesLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
