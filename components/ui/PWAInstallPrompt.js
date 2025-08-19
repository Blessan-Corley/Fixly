'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true);

    // Detect mobile devices (phones and tablets)
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 1024; // Consider tablets as mobile for PWA
      return isMobileUA || (isTouchDevice && isSmallScreen);
    };
    
    setIsMobile(checkMobile());

    // Detect iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Only prevent default if we're actually going to show a custom prompt
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Show prompt after a delay if not dismissed before
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const lastShown = localStorage.getItem('pwa-install-last-shown');
        const daysSinceLastShown = lastShown ? 
          Math.floor((Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24)) : 7;
        
        if (!dismissed && daysSinceLastShown >= 7 && !isStandalone && isMobile) {
          setShowPrompt(true);
        }
      }, 3000); // Show after 3 seconds (reduced from 10)
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setIsInstallable(false);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
        setIsInstallable(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-last-shown', Date.now().toString());
  };

  const showManualPrompt = () => {
    setShowPrompt(true);
  };

  // Don't show if already in standalone mode or not on mobile
  if (isStandalone || !isMobile) return null;

  return (
    <>
      {/* Install button in header/navbar */}
      {isInstallable && !showPrompt && (
        <button
          onClick={showManualPrompt}
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          title="Install Fixly App"
        >
          <Download className="w-4 h-4" />
          <span className="inline text-gray-900 font-semibold">Install App</span>
        </button>
      )}

      {/* Mobile install hint */}
      {isInstallable && !showPrompt && (
        <div className="sm:hidden fixed bottom-20 right-4 z-40">
          <button
            onClick={showManualPrompt}
            className="bg-teal-600 text-white p-3 rounded-full shadow-lg hover:bg-teal-700 transition-all duration-300 hover:scale-110"
            title="Install Fixly App"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main install prompt */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Get Fixly as an App</h3>
                  <p className="text-sm text-gray-600">Install for the best mobile experience</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <span>Fast access from your home screen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <span>Get instant notifications for jobs</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>
                <span>Works like a real mobile app</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
                <span>No app store download needed</span>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  To install as an app on iOS, tap the share button and select "Add to Home Screen"
                </p>
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-white rounded-sm"></div>
                    </div>
                    <span className="text-sm font-medium">Share</span>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-teal-500 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install as App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Later
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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