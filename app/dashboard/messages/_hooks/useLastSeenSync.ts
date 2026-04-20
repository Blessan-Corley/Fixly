'use client';

import { useEffect, useRef } from 'react';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';

async function patchPresence(online: boolean): Promise<void> {
  try {
    await fetchWithCsrf('/api/user/presence', {
      method: 'PATCH',
      body: JSON.stringify({ online }),
    });
  } catch {
    // best-effort — silently swallow errors
  }
}

function sendBeaconOffline(): void {
  // navigator.sendBeacon can't set custom headers, so we fall back to a
  // keepalive fetch which fires even if the page is unloading.
  void fetch('/api/user/presence', {
    method: 'PATCH',
    body: JSON.stringify({ online: false }),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Marks the user online on mount and offline on unmount.
 * Also reacts to tab visibility changes so background tabs update lastSeen.
 *
 * @param enabled  Pass false when there is no session (avoids unauthenticated calls).
 */
export function useLastSeenSync(enabled: boolean): void {
  // Track whether we currently think we are online so we don't send duplicate patches.
  const isOnlineRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Go online immediately.
    void patchPresence(true);
    isOnlineRef.current = true;

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        if (isOnlineRef.current) {
          isOnlineRef.current = false;
          sendBeaconOffline();
        }
      } else {
        if (!isOnlineRef.current) {
          isOnlineRef.current = true;
          void patchPresence(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Mark offline on unmount.
      isOnlineRef.current = false;
      sendBeaconOffline();
    };
  }, [enabled]);
}
