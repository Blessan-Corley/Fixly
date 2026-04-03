import type { ReactNode } from 'react';
export { metadata } from './metadata';

type PricingLayoutProps = {
  children: ReactNode;
};

export default function PricingLayout({ children }: PricingLayoutProps) {
  return <>{children}</>;
}
