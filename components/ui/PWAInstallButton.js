'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

export default function PWAInstallButton({ variant = 'button', className = '' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || 
                    window.navigator.standalone === true);

    // Detect iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  // Don't show if already installed
  if (isStandalone) return null;

  // For iOS, show instructions
  if (isIOS) {
    return (
      <div className={`${className}`}>
        {variant === 'link' ? (
          <button className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Install as App (Share → Add to Home Screen)
          </button>
        ) : (
          <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            Get the App
          </button>
        )}
      </div>
    );
  }

  // For Android/other browsers with install capability
  if (isInstallable) {
    return (
      <div className={`${className}`}>
        {variant === 'link' ? (
          <button 
            onClick={handleInstall}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install as App
          </button>
        ) : (
          <button 
            onClick={handleInstall}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Get the App
          </button>
        )}
      </div>
    );
  }

  // Don't show anything if not installable
  return null;
}

// Hook for checking PWA installation status
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true
    );

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { canInstall, isInstalled };
}