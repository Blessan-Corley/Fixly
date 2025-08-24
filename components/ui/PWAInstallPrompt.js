'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Smartphone, Monitor, Share, Plus, Check, Info, Wifi, WifiOff, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Enhanced PWA capabilities detector
class PWACapabilities {
  static detect() {
    if (typeof window === 'undefined') return {};
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    const standalone = window.navigator.standalone;
    const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    return {
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
      isMobile: /mobi|android/i.test(userAgent),
      isStandalone: standalone || isDisplayModeStandalone,
      canInstall: 'serviceWorker' in navigator,
      hasBeforeInstallPrompt: 'onbeforeinstallprompt' in window,
      supportsWebShare: 'share' in navigator,
      supportsNotifications: 'Notification' in window,
      supportsBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      supportsPushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
      isOnline: navigator.onLine,
      connectionType: navigator.connection?.effectiveType || 'unknown'
    };
  }
  
  static getInstallInstructions(platform) {
    if (platform.isIOS) {
      return {
        title: 'Install Fixly on iOS',
        steps: [
          { icon: Share, text: 'Tap the Share button in Safari' },
          { icon: Plus, text: 'Select "Add to Home Screen"' },
          { icon: Check, text: 'Tap "Add" to install' }
        ],
        note: 'Fixly will appear on your home screen like a native app with offline access'
      };
    }
    
    if (platform.isAndroid) {
      return {
        title: 'Install Fixly on Android',
        steps: [
          { icon: Download, text: 'Tap "Install" when prompted' },
          { icon: Monitor, text: 'Or use browser menu > "Add to Home Screen"' }
        ],
        note: 'Get the full app experience with offline access and push notifications'
      };
    }
    
    return {
      title: 'Install Fixly Desktop App',
      steps: [
        { icon: Download, text: 'Click "Install" when prompted' },
        { icon: Monitor, text: 'Or check your browser\'s address bar for install icon' }
      ],
      note: 'Access Fixly directly from your desktop with enhanced performance'
    };
  }
}

// Enhanced installation analytics
class PWAAnalytics {
  static track(event, data = {}) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        event_category: 'PWA',
        ...data
      });
    }
    
    // Also log to console for debugging
    console.log('PWA Analytics:', event, data);
  }
}

export default function PWAInstallPrompt({
  variant = 'auto', // 'auto', 'banner', 'modal', 'button'
  autoShow = true,
  showDismiss = true,
  className = '',
  onInstall = null,
  onDismiss = null,
  showFeatures = true,
  customFeatures = null
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState(null);
  const [capabilities, setCapabilities] = useState({});
  const [networkStatus, setNetworkStatus] = useState(true);
  const installAttemptRef = useRef(0);
  const dismissedRef = useRef(false);

  // Enhanced initialization with comprehensive platform detection
  useEffect(() => {
    const caps = PWACapabilities.detect();
    setCapabilities(caps);
    setNetworkStatus(caps.isOnline);
    
    // Don't show if already installed
    if (caps.isStandalone) {
      return;
    }
    
    // Check dismissal status with enhanced logic
    const checkDismissalStatus = () => {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const lastShown = localStorage.getItem('pwa-install-last-shown');
      const installCount = parseInt(localStorage.getItem('pwa-install-attempts') || '0');
      
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        
        // Progressive re-engagement: show again after longer periods for frequent dismissers
        const cooldownDays = Math.min(7 * Math.pow(2, installCount), 30); // 7, 14, 28, 30 days max
        
        if (daysSinceDismissed < cooldownDays) {
          dismissedRef.current = true;
          return false;
        }
      }
      
      const daysSinceLastShown = lastShown ? 
        Math.floor((Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24)) : 7;
      
      return daysSinceLastShown >= 3; // Reduced cooldown for re-showing
    };
    
    // Enhanced beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      PWAAnalytics.track('install_prompt_available', {
        platform: caps.isIOS ? 'iOS' : caps.isAndroid ? 'Android' : 'Desktop',
        connection: caps.connectionType
      });
      
      if (autoShow && checkDismissalStatus()) {
        // Intelligent timing based on user activity
        const showDelay = caps.isMobile ? 5000 : 3000; // Longer delay on mobile
        
        setTimeout(() => {
          if (!dismissedRef.current) {
            setShowPrompt(true);
            localStorage.setItem('pwa-install-last-shown', Date.now().toString());
          }
        }, showDelay);
      }
    };

    // Enhanced app installed handler
    const handleAppInstalled = (e) => {
      console.log('PWA installed successfully');
      setShowPrompt(false);
      setIsInstallable(false);
      setInstallResult({ success: true, method: 'native' });
      
      // Clear dismissal flags
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-attempts');
      localStorage.setItem('pwa-installed', Date.now().toString());
      
      PWAAnalytics.track('app_installed', {
        method: 'native',
        platform: caps.isIOS ? 'iOS' : caps.isAndroid ? 'Android' : 'Desktop'
      });
      
      // Notify parent component
      onInstall?.({ success: true, method: 'native', event: e });
      
      // Show success notification
      toast.success('App installed successfully!', {
        description: 'Fixly is now available from your home screen',
        duration: 5000
      });
    };
    
    // Network status monitoring
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    // Set up event listeners
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

  const handleInstall = useCallback(async () => {
    if (installing || !deferredPrompt) return;
    
    setInstalling(true);
    installAttemptRef.current += 1;
    
    try {
      PWAAnalytics.track('install_attempt', {
        attempt: installAttemptRef.current,
        platform: capabilities.isIOS ? 'iOS' : capabilities.isAndroid ? 'Android' : 'Desktop'
      });
      
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      const result = {
        success: outcome === 'accepted',
        method: 'prompt',
        outcome
      };
      
      setInstallResult(result);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
        setIsInstallable(false);
        
        PWAAnalytics.track('install_accepted', {
          platform: capabilities.isIOS ? 'iOS' : capabilities.isAndroid ? 'Android' : 'Desktop',
          attempt: installAttemptRef.current
        });
        
        onInstall?.(result);
        
        toast.success('Installation started!', {
          description: 'Fixly will be added to your device shortly',
          duration: 3000
        });
      } else {
        PWAAnalytics.track('install_declined', {
          platform: capabilities.isIOS ? 'iOS' : capabilities.isAndroid ? 'Android' : 'Desktop',
          attempt: installAttemptRef.current
        });
        
        toast.info('Installation cancelled', {
          description: 'You can install Fixly later from the browser menu',
          duration: 4000
        });
        
        // Track declined attempts
        localStorage.setItem('pwa-install-attempts', installAttemptRef.current.toString());
      }
    } catch (error) {
      console.error('Install failed:', error);
      
      PWAAnalytics.track('install_error', {
        error: error.message,
        platform: capabilities.isIOS ? 'iOS' : capabilities.isAndroid ? 'Android' : 'Desktop'
      });
      
      toast.error('Installation failed', {
        description: 'Please try again or install manually from browser menu',
        duration: 5000
      });
    } finally {
      setInstalling(false);
    }
  }, [installing, deferredPrompt, capabilities, onInstall]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    dismissedRef.current = true;
    
    const currentAttempts = parseInt(localStorage.getItem('pwa-install-attempts') || '0');
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    localStorage.setItem('pwa-install-attempts', (currentAttempts + 1).toString());
    
    PWAAnalytics.track('install_dismissed', {
      platform: capabilities.isIOS ? 'iOS' : capabilities.isAndroid ? 'Android' : 'Desktop',
      dismissCount: currentAttempts + 1
    });
    
    onDismiss?.();
  }, [capabilities, onDismiss]);

  const showManualPrompt = useCallback(() => {
    setShowPrompt(true);
    localStorage.setItem('pwa-install-last-shown', Date.now().toString());
    
    PWAAnalytics.track('install_manual_trigger', {
      platform: capabilities.isIOS ? 'iOS' : capabilities.isAndroid ? 'Android' : 'Desktop'
    });
  }, [capabilities]);
  
  // Get enhanced feature list
  const getFeatures = () => {
    if (customFeatures) return customFeatures;
    
    const features = [
      {
        icon: networkStatus ? Wifi : WifiOff,
        text: 'Works offline',
        color: 'green',
        available: capabilities.canInstall
      },
      {
        icon: Bell,
        text: 'Push notifications',
        color: 'blue',
        available: capabilities.supportsNotifications
      },
      {
        icon: Download,
        text: 'Faster loading',
        color: 'purple',
        available: true
      },
      {
        icon: Smartphone,
        text: 'Native app experience',
        color: 'teal',
        available: true
      }
    ];
    
    return features.filter(feature => feature.available);
  };
  
  const features = getFeatures();
  const instructions = PWACapabilities.getInstallInstructions(capabilities);

  // Don't render if conditions not met
  if (capabilities.isStandalone || (!capabilities.isMobile && variant === 'auto')) {
    return null;
  }
  
  // Button variant for manual trigger
  if (variant === 'button') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={capabilities.isIOS ? showManualPrompt : handleInstall}
        disabled={installing || (!isInstallable && !capabilities.isIOS)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors ${className}`}
      >
        {installing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Download className="h-4 w-4" />
          </motion.div>
        ) : (
          <Download className="h-4 w-4" />
        )}
        {installing ? 'Installing...' : 'Install App'}
      </motion.button>
    );
  }

  return (
    <>
      {/* Enhanced install button in header/navbar */}
      {isInstallable && !showPrompt && variant === 'auto' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={showManualPrompt}
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md"
          title="Install Fixly App - Works offline with push notifications"
        >
          <Download className="w-4 h-4" />
          <span className="inline text-gray-900 font-semibold">Install App</span>
          {!networkStatus && (
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" title="Offline mode available" />
          )}
        </motion.button>
      )}

      {/* Enhanced mobile install hint */}
      {isInstallable && !showPrompt && variant === 'auto' && (
        <div className="sm:hidden fixed bottom-20 right-4 z-40">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ 
              y: [0, -5, 0],
              transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            onClick={showManualPrompt}
            className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 relative"
            title="Install Fixly App - Full offline experience"
          >
            <Download className="w-5 h-5" />
            {!networkStatus && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse border-2 border-white" />
            )}
            {capabilities.supportsNotifications && (
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse border-2 border-white" />
            )}
          </motion.button>
        </div>
      )}

      {/* Enhanced main install prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={variant === 'modal' ? handleDismiss : undefined}
          >
            <motion.div
              initial={{ 
                y: variant === 'modal' ? 50 : '100%',
                scale: variant === 'modal' ? 0.95 : 1,
                opacity: 0
              }}
              animate={{ 
                y: 0,
                scale: 1,
                opacity: 1
              }}
              exit={{ 
                y: variant === 'modal' ? 50 : '100%',
                scale: variant === 'modal' ? 0.95 : 1,
                opacity: 0
              }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                    {capabilities.isIOS ? (
                      <Smartphone className="w-6 h-6 text-white" />
                    ) : (
                      <Download className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {instructions.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {capabilities.isMobile ? 'Best mobile experience' : 'Enhanced desktop experience'}
                    </p>
                    {!networkStatus && (
                      <div className="flex items-center gap-1 mt-1">
                        <WifiOff className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-orange-600">Offline mode available</span>
                      </div>
                    )}
                  </div>
                </div>
                {showDismiss && (
                  <button
                    onClick={handleDismiss}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Maybe later"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>

              {/* Features */}
              {showFeatures && features.length > 0 && (
                <div className="space-y-3 mb-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <div className={`w-5 h-5 bg-${feature.color}-100 dark:bg-${feature.color}-900 rounded-full flex items-center justify-center`}>
                        <feature.icon className={`w-3 h-3 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                      </div>
                      <span>{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Installation instructions */}
              {capabilities.isIOS ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {instructions.steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <step.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{step.text}</span>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {instructions.note}
                  </p>
                  <button
                    onClick={handleDismiss}
                    className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {instructions.note}
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleInstall}
                      disabled={installing}
                      className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {installing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Download className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {installing ? 'Installing...' : 'Install as App'}
                    </motion.button>
                    {showDismiss && (
                      <button
                        onClick={handleDismiss}
                        className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
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
    </>
  );
}

// Hook for components to trigger install prompt
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = () => {
    const event = new CustomEvent('pwa-install-trigger');
    window.dispatchEvent(event);
  };

  return { canInstall, triggerInstall };
}