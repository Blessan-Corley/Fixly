'use client';

import type { ReactNode } from 'react';

import { AblyProvider } from '@/contexts/AblyContext';

type DashboardRealtimeProviderProps = {
  children: ReactNode;
};

export default function DashboardRealtimeProvider({
  children,
}: DashboardRealtimeProviderProps): React.JSX.Element {
  return (
    <AblyProvider>
      {children}
    </AblyProvider>
  );
}
