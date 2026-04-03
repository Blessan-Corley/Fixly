import type { ReactNode } from 'react';
export { metadata } from './metadata';

type HowItWorksLayoutProps = {
  children: ReactNode;
};

export default function HowItWorksLayout({ children }: HowItWorksLayoutProps) {
  return <>{children}</>;
}
