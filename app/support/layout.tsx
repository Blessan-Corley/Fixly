import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Support — Fixly',
  description: 'Get support from the Fixly team. Report issues, request refunds, or get help with your account.',
};

export default function SupportLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
