import type { ReactNode } from 'react';
export { metadata } from './metadata';

type AboutLayoutProps = {
  children: ReactNode;
};

export default function AboutLayout({ children }: AboutLayoutProps) {
  return <>{children}</>;
}
