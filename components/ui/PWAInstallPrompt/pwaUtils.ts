import { Bell, Check, Download, Monitor, Plus, Share, Smartphone, Wifi, WifiOff } from 'lucide-react';

import type {
  FeatureColor,
  InstallInstructions,
  PWAFeature,
  PWAPlatformCapabilities,
} from './types';

export const DEFAULT_CAPABILITIES: PWAPlatformCapabilities = {
  isIOS: false,
  isAndroid: false,
  isMobile: false,
  isStandalone: false,
  canInstall: false,
  hasBeforeInstallPrompt: false,
  supportsWebShare: false,
  supportsNotifications: false,
  supportsBackgroundSync: false,
  supportsPushNotifications: false,
  isOnline: true,
  connectionType: 'unknown',
};

export const FEATURE_COLOR_CLASSES: Record<FeatureColor, { bg: string; text: string }> = {
  green: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-600 dark:text-green-400' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900', text: 'text-teal-600 dark:text-teal-400' },
};

export class PWACapabilities {
  static detect(): PWAPlatformCapabilities {
    if (typeof window === 'undefined') return DEFAULT_CAPABILITIES;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const standalone = window.navigator.standalone;
    const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;

    return {
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
      isMobile: /mobi|android/i.test(userAgent),
      isStandalone: Boolean(standalone || isDisplayModeStandalone),
      canInstall: 'serviceWorker' in navigator,
      hasBeforeInstallPrompt: 'onbeforeinstallprompt' in window,
      supportsWebShare: 'share' in navigator,
      supportsNotifications: 'Notification' in window,
      supportsBackgroundSync:
        'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype,
      supportsPushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
      isOnline: navigator.onLine,
      connectionType: navigator.connection?.effectiveType ?? 'unknown',
    };
  }

  static getInstallInstructions(platform: PWAPlatformCapabilities): InstallInstructions {
    if (platform.isIOS) {
      return {
        title: 'Install Fixly on iOS',
        steps: [
          { icon: Share, text: 'Tap the Share button in Safari' },
          { icon: Plus, text: 'Select "Add to Home Screen"' },
          { icon: Check, text: 'Tap "Add" to install' },
        ],
        note: 'Fixly will appear on your home screen like a native app with offline access',
      };
    }

    if (platform.isAndroid) {
      return {
        title: 'Install Fixly on Android',
        steps: [
          { icon: Download, text: 'Tap "Install" when prompted' },
          { icon: Monitor, text: 'Or use browser menu > "Add to Home Screen"' },
        ],
        note: 'Get the full app experience with offline access and push notifications',
      };
    }

    return {
      title: 'Install Fixly Desktop App',
      steps: [
        { icon: Download, text: 'Click "Install" when prompted' },
        { icon: Monitor, text: "Or check your browser's address bar for install icon" },
      ],
      note: 'Access Fixly directly from your desktop with enhanced performance',
    };
  }
}

export function getPlatformName(capabilities: PWAPlatformCapabilities): string {
  if (capabilities.isIOS) return 'iOS';
  if (capabilities.isAndroid) return 'Android';
  return 'Desktop';
}

export function checkPWADismissalStatus(): boolean {
  const dismissedValue = localStorage.getItem('pwa-install-dismissed');
  const lastShown = localStorage.getItem('pwa-install-last-shown');
  const attemptValue = Number.parseInt(localStorage.getItem('pwa-install-attempts') ?? '0', 10);
  const installCount = Number.isFinite(attemptValue) ? attemptValue : 0;

  if (dismissedValue) {
    const dismissedTime = Number.parseInt(dismissedValue, 10);
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    const cooldownDays = Math.min(7 * Math.pow(2, installCount), 30);
    if (daysSinceDismissed < cooldownDays) return false;
  }

  const daysSinceLastShown = lastShown
    ? Math.floor((Date.now() - Number.parseInt(lastShown, 10)) / (1000 * 60 * 60 * 24))
    : 7;

  return daysSinceLastShown >= 3;
}

export function buildFeatures(
  networkStatus: boolean,
  capabilities: PWAPlatformCapabilities,
  customFeatures?: PWAFeature[] | null
): PWAFeature[] {
  if (customFeatures) return customFeatures;

  const features: PWAFeature[] = [
    { icon: networkStatus ? Wifi : WifiOff, text: 'Works offline', color: 'green', available: capabilities.canInstall },
    { icon: Bell, text: 'Push notifications', color: 'blue', available: capabilities.supportsNotifications },
    { icon: Download, text: 'Faster loading', color: 'teal', available: true },
    { icon: Smartphone, text: 'Native app experience', color: 'teal', available: true },
  ];

  return features.filter((feature) => feature.available);
}

export class PWAAnalytics {
  static track(event: string, data: Record<string, unknown> = {}): void {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        event_category: 'PWA',
        ...data,
      });
    }
  }
}
