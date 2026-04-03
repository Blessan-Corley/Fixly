'use client';

import { useConnectionStatus } from '@/lib/ably/hooks';

export function ConnectionStatus(): React.JSX.Element | null {
  const { status, isConnected, reconnectAttempts } = useConnectionStatus();

  if (isConnected || status === 'connecting') {
    return null;
  }

  if (status === 'disconnected' || status === 'suspended') {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 shadow-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
          <span>Reconnecting{reconnectAttempts > 0 ? ` (attempt ${reconnectAttempts})` : ''}...</span>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span>Live updates unavailable. Refresh to reconnect.</span>
        </div>
      </div>
    );
  }

  return null;
}
