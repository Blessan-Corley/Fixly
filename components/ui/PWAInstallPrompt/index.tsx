'use client';

import { motion } from 'framer-motion';
import { Download } from 'lucide-react';

import { PWAPromptOverlay } from './PWAPromptOverlay';
import type { PWAInstallPromptProps } from './types';
import { usePWAInstallPrompt } from './usePWAInstallPrompt';

export { usePWAInstall } from './usePWAInstall';

export default function PWAInstallPrompt({
  variant = 'auto',
  autoShow = true,
  showDismiss = true,
  className = '',
  onInstall,
  onDismiss,
  showFeatures = true,
  customFeatures = null,
}: PWAInstallPromptProps): React.JSX.Element | null {
  const {
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
  } = usePWAInstallPrompt({
    autoShow,
    onInstall,
    onDismiss,
    showFeatures,
    customFeatures,
    networkStatus: true,
  });

  if (capabilities.isStandalone || (!capabilities.isMobile && variant === 'auto')) {
    return null;
  }

  if (variant === 'button') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={capabilities.isIOS ? showManualPrompt : () => void handleInstall()}
        disabled={installing || (!isInstallable && !capabilities.isIOS)}
        className={`inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-600 disabled:bg-gray-400 ${className}`}
      >
        {installing ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Download className="h-4 w-4" />
          </motion.div>
        ) : (
          <Download className="h-4 w-4" />
        )}
        {installing ? 'Installing...' : 'Install App'}
      </motion.button>
    );
  }

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={capabilities.isIOS ? showManualPrompt : () => void handleInstall()}
        disabled={installing || (!isInstallable && !capabilities.isIOS)}
        className={`flex items-center text-sm text-fixly-text-secondary transition-colors hover:text-fixly-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <Download className="mr-2 h-4 w-4" />
        Install Fixly App
      </button>
    );
  }

  return (
    <>
      {isInstallable && !showPrompt && variant === 'auto' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={showManualPrompt}
          className="hidden items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md sm:flex"
          title="Install Fixly App - Works offline with push notifications"
        >
          <Download className="h-4 w-4" />
          <span className="inline font-semibold text-gray-900">Install App</span>
          {!networkStatus && <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500" />}
        </motion.button>
      )}

      {isInstallable && !showPrompt && variant === 'auto' && (
        <div className="fixed bottom-20 right-4 z-40 sm:hidden">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ y: [0, -5, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
            onClick={showManualPrompt}
            className="relative rounded-full bg-gradient-to-br from-teal-500 to-teal-600 p-3 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
            title="Install Fixly App - Full offline experience"
          >
            <Download className="h-5 w-5" />
            {!networkStatus && (
              <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-orange-500" />
            )}
            {capabilities.supportsNotifications && (
              <div className="absolute -left-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-blue-500" />
            )}
          </motion.button>
        </div>
      )}

      <PWAPromptOverlay
        showPrompt={showPrompt}
        variant={variant}
        showDismiss={showDismiss}
        showFeatures={showFeatures}
        features={features}
        instructions={instructions}
        capabilities={capabilities}
        networkStatus={networkStatus}
        installing={installing}
        handleInstall={handleInstall}
        handleDismiss={handleDismiss}
      />
    </>
  );
}
