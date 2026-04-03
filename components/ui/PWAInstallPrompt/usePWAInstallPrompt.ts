'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  buildFeatures,
  checkPWADismissalStatus,
  DEFAULT_CAPABILITIES,
  getPlatformName,
  PWAAnalytics,
  PWACapabilities,
} from './pwaUtils';
import type {
  BeforeInstallPromptEvent,
  InstallResult,
  PWAPlatformCapabilities,
  UsePWAInstallPromptOptions,
  UsePWAInstallPromptResult,
} from './types';

export type { UsePWAInstallPromptResult, UsePWAInstallPromptOptions };

export function usePWAInstallPrompt({
  autoShow,
  onInstall,
  onDismiss,
  customFeatures,
}: UsePWAInstallPromptOptions): UsePWAInstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [installing, setInstalling] = useState<boolean>(false);
  const [, setInstallResult] = useState<InstallResult | null>(null);
  const [capabilities, setCapabilities] = useState<PWAPlatformCapabilities>(DEFAULT_CAPABILITIES);
  const [networkStatus, setNetworkStatus] = useState<boolean>(true);

  const installAttemptRef = useRef<number>(0);
  const dismissedRef = useRef<boolean>(false);

  useEffect(() => {
    const caps = PWACapabilities.detect();
    setCapabilities(caps);
    setNetworkStatus(caps.isOnline);

    if (caps.isStandalone) return;

    const handleBeforeInstallPrompt = (event: Event): void => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      setIsInstallable(true);

      PWAAnalytics.track('install_prompt_available', { platform: getPlatformName(caps), connection: caps.connectionType });

      if (autoShow && checkPWADismissalStatus()) {
        const showDelay = caps.isMobile ? 5000 : 3000;
        setTimeout(() => {
          if (dismissedRef.current) return;
          setShowPrompt(true);
          localStorage.setItem('pwa-install-last-shown', Date.now().toString());
        }, showDelay);
      }
    };

    const handleAppInstalled = (): void => {
      setShowPrompt(false);
      setIsInstallable(false);
      setInstallResult({ success: true, method: 'native' });

      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-attempts');
      localStorage.setItem('pwa-installed', Date.now().toString());

      PWAAnalytics.track('app_installed', { method: 'native', platform: getPlatformName(caps) });
      onInstall?.({ success: true, method: 'native' });

      toast.success('App installed successfully!', {
        description: 'Fixly is now available from your home screen',
        duration: 5000,
      });
    };

    const handleOnline = (): void => setNetworkStatus(true);
    const handleOffline = (): void => setNetworkStatus(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoShow, onInstall]);

  const handleInstall = useCallback(async (): Promise<void> => {
    if (installing || !deferredPrompt) return;

    setInstalling(true);
    installAttemptRef.current += 1;
    const platform = getPlatformName(capabilities);

    try {
      PWAAnalytics.track('install_attempt', { attempt: installAttemptRef.current, platform });

      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      const result: InstallResult = { success: outcome === 'accepted', method: 'prompt', outcome };
      setInstallResult(result);

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
        setIsInstallable(false);

        PWAAnalytics.track('install_accepted', { platform, attempt: installAttemptRef.current });
        onInstall?.(result);

        toast.success('Installation started!', {
          description: 'Fixly will be added to your device shortly',
          duration: 3000,
        });
      } else {
        PWAAnalytics.track('install_declined', { platform, attempt: installAttemptRef.current });

        toast.info('Installation cancelled', {
          description: 'You can install Fixly later from the browser menu',
          duration: 4000,
        });

        localStorage.setItem('pwa-install-attempts', installAttemptRef.current.toString());
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      PWAAnalytics.track('install_error', { error: message, platform });

      toast.error('Installation failed', {
        description: 'Please try again or install manually from browser menu',
        duration: 5000,
      });
    } finally {
      setInstalling(false);
    }
  }, [installing, deferredPrompt, capabilities, onInstall]);

  const handleDismiss = useCallback((): void => {
    setShowPrompt(false);
    dismissedRef.current = true;

    const attemptValue = Number.parseInt(localStorage.getItem('pwa-install-attempts') ?? '0', 10);
    const currentAttempts = Number.isFinite(attemptValue) ? attemptValue : 0;

    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    localStorage.setItem('pwa-install-attempts', (currentAttempts + 1).toString());

    PWAAnalytics.track('install_dismissed', { platform: getPlatformName(capabilities), dismissCount: currentAttempts + 1 });
    onDismiss?.();
  }, [capabilities, onDismiss]);

  const showManualPrompt = useCallback((): void => {
    setShowPrompt(true);
    localStorage.setItem('pwa-install-last-shown', Date.now().toString());
    PWAAnalytics.track('install_manual_trigger', { platform: getPlatformName(capabilities) });
  }, [capabilities]);

  const features = buildFeatures(networkStatus, capabilities, customFeatures);
  const instructions = PWACapabilities.getInstallInstructions(capabilities);

  return {
    showPrompt,
    isInstallable,
    installing,
    capabilities,
    networkStatus,
    features,
    instructions,
    handleInstall,
    handleDismiss,
    showManualPrompt,
  };
}
