'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';

import { FEATURE_COLOR_CLASSES } from './pwaUtils';
import type {
  InstallInstructions,
  PromptVariant,
  PWAFeature,
  PWAPlatformCapabilities,
} from './types';

export type PWAPromptOverlayProps = {
  showPrompt: boolean;
  variant: PromptVariant;
  showDismiss: boolean;
  showFeatures: boolean;
  features: PWAFeature[];
  instructions: InstallInstructions;
  capabilities: PWAPlatformCapabilities;
  networkStatus: boolean;
  installing: boolean;
  handleInstall: () => Promise<void>;
  handleDismiss: () => void;
};

export function PWAPromptOverlay({
  showPrompt,
  variant,
  showDismiss,
  showFeatures,
  features,
  instructions,
  capabilities,
  networkStatus,
  installing,
  handleInstall,
  handleDismiss,
}: PWAPromptOverlayProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={variant === 'modal' ? handleDismiss : undefined}
        >
          <motion.div
            initial={{
              y: variant === 'modal' ? 50 : '100%',
              scale: variant === 'modal' ? 0.95 : 1,
              opacity: 0,
            }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{
              y: variant === 'modal' ? 50 : '100%',
              scale: variant === 'modal' ? 0.95 : 1,
              opacity: 0,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-t-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 shadow-lg">
                  {capabilities.isIOS ? (
                    <Smartphone className="h-6 w-6 text-white" />
                  ) : (
                    <Download className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {instructions.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {capabilities.isMobile ? 'Best mobile experience' : 'Enhanced desktop experience'}
                  </p>
                  {!networkStatus && (
                    <div className="mt-1 flex items-center gap-1">
                      <WifiOff className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-orange-600">Offline mode available</span>
                    </div>
                  )}
                </div>
              </div>
              {showDismiss && (
                <button
                  onClick={handleDismiss}
                  className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Maybe later"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>

            {showFeatures && features.length > 0 && (
              <div className="mb-6 space-y-3">
                {features.map((feature, index) => {
                  const classes = FEATURE_COLOR_CLASSES[feature.color];
                  const FeatureIcon = feature.icon;

                  return (
                    <motion.div
                      key={`${feature.text}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <div className={`h-5 w-5 ${classes.bg} flex items-center justify-center rounded-full`}>
                        <FeatureIcon className={`h-3 w-3 ${classes.text}`} />
                      </div>
                      <span>{feature.text}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {capabilities.isIOS ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {instructions.steps.map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <motion.div
                        key={`${step.text}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                          <StepIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{step.text}</span>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {instructions.note}
                </p>
                <button
                  onClick={handleDismiss}
                  className="w-full py-3 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Got it
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {instructions.note}
                </p>
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => void handleInstall()}
                    disabled={installing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 font-semibold text-white transition-all duration-300 hover:from-teal-700 hover:to-teal-600 hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500"
                  >
                    {installing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Download className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {installing ? 'Installing...' : 'Install as App'}
                  </motion.button>
                  {showDismiss && (
                    <button
                      onClick={handleDismiss}
                      className="px-4 py-3 font-medium text-gray-600 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Later
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
