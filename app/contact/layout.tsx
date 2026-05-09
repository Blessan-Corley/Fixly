import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Contact Us — Fixly',
  description: 'Get in touch with the Fixly team. We are here to help with any questions about our hyperlocal service marketplace.',
};

export default function ContactLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
