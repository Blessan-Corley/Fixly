'use client';

import { useEffect, useState } from 'react';

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (): void => {
      setCanInstall(true);
    };

    const handleAppInstalled = (): void => {
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = (): void => {
    window.dispatchEvent(new CustomEvent('pwa-install-trigger'));
  };

  return { canInstall, triggerInstall };
}
