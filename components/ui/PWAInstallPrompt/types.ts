import type { LucideIcon } from 'lucide-react';

export type PromptVariant = 'auto' | 'banner' | 'modal' | 'button' | 'link';
export type InstallOutcome = 'accepted' | 'dismissed';
export type FeatureColor = 'green' | 'blue' | 'teal';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
}

export interface PWAPlatformCapabilities {
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  hasBeforeInstallPrompt: boolean;
  supportsWebShare: boolean;
  supportsNotifications: boolean;
  supportsBackgroundSync: boolean;
  supportsPushNotifications: boolean;
  isOnline: boolean;
  connectionType: string;
}

export interface InstallStep {
  icon: LucideIcon;
  text: string;
}

export interface InstallInstructions {
  title: string;
  steps: InstallStep[];
  note: string;
}

export interface InstallResult {
  success: boolean;
  method: 'native' | 'prompt';
  outcome?: InstallOutcome;
}

export interface PWAFeature {
  icon: LucideIcon;
  text: string;
  color: FeatureColor;
  available: boolean;
}

export interface PWAInstallPromptProps {
  variant?: PromptVariant;
  autoShow?: boolean;
  showDismiss?: boolean;
  className?: string;
  onInstall?: (result: InstallResult) => void;
  onDismiss?: () => void;
  showFeatures?: boolean;
  customFeatures?: PWAFeature[] | null;
}

export interface UsePWAInstallPromptResult {
  showPrompt: boolean;
  isInstallable: boolean;
  installing: boolean;
  capabilities: PWAPlatformCapabilities;
  networkStatus: boolean;
  features: PWAFeature[];
  instructions: InstallInstructions;
  handleInstall: () => Promise<void>;
  handleDismiss: () => void;
  showManualPrompt: () => void;
}

export type UsePWAInstallPromptOptions = Pick<
  PWAInstallPromptProps,
  'autoShow' | 'onInstall' | 'onDismiss' | 'showFeatures' | 'customFeatures'
> & {
  networkStatus: boolean;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }

  interface Navigator {
    standalone?: boolean;
    connection?: {
      effectiveType?: string;
    };
  }
}
