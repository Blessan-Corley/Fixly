'use client';

import { Bell, BellOff } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { usePushNotificationManager } from './usePushNotificationManager';

export default function PushNotificationManager(): React.JSX.Element | null {
  const { data: session } = useSession();
  const { supported, enabled, loading, permissionState, statusMessage, isConnected, handleToggle } =
    usePushNotificationManager();

  if (!supported || !session) {
    return null;
  }

  return (
    <div className="bg-fixly-surface flex items-center gap-3 rounded-lg border border-fixly-border p-4 dark:bg-fixly-card">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h4 className="font-medium text-fixly-text">Push Notifications</h4>
          {isConnected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Live via Ably
            </span>
          )}
        </div>
        <p className="text-sm text-fixly-text-muted">
          {statusMessage}.{' '}
          {permissionState === 'denied'
            ? 'Browser permission is blocked.'
            : 'Messages, comments, jobs, and updates will arrive without keeping the app open.'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
          enabled
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
            : 'bg-fixly-primary-bg text-fixly-primary hover:bg-fixly-primary-bg/80'
        } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : enabled ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {enabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
