'use client';

import { useConnectionStore } from '@/lib/stores/connectionStore';

/**
 * Returns the current Ably connection status from Zustand.
 * Use this anywhere in the app to show connection state UI.
 */
export function useConnectionStatus(): {
  status: ReturnType<typeof useConnectionStore.getState>['ablyStatus'];
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
} {
  const { ablyStatus, lastConnectedAt, reconnectAttempts } = useConnectionStore();

  return {
    status: ablyStatus,
    isConnected: ablyStatus === 'connected',
    isConnecting: ablyStatus === 'connecting',
    isDisconnected:
      ablyStatus === 'disconnected' || ablyStatus === 'suspended' || ablyStatus === 'failed',
    lastConnectedAt,
    reconnectAttempts,
  };
}
