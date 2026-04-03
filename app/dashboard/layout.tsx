import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import DashboardLayoutClient from './layout.client';
import DashboardRealtimeProvider from './realtime-provider';

export const metadata: Metadata = {
  title: 'Dashboard - Fixly',
  robots: {
    index: false,
    follow: false,
  },
};

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  return (
    <DashboardRealtimeProvider>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </DashboardRealtimeProvider>
  );
}
