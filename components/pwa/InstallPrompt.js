'use client';

import { useState, useEffect } from 'react';
import { getPWAManager } from '../../lib/pwa/PWAManager';

const InstallPrompt = ({ 
  className = '',
  theme = 'default',
  position = 'bottom',
  autoShow = true,
  dismissible = true 
}) => {
  const [pwaManager] = useState(() => getPWAManager());
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [appInfo, setAppInfo] = useState(null);

  useEffect(() => {
    // Check if prompt was previously dismissed
    const dismissed = localStorage.getItem('fixly_install_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Get app information
    const info = pwaManager.getAppInfo();
    setAppInfo(info);

    // Set up event listeners for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      if (autoShow && !isDismissed && !info.isInstalled) {
        setShowPrompt(true);
      }
    };

    const handleInstallPromptAvailable = () => {
      if (autoShow && !isDismissed && !info.isInstalled) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setAppInfo(prev => ({ ...prev, isInstalled: true }));
    };

    const handleInstallAccepted = () => {
      setIsInstalling(true);
    };

    // Add beforeinstallprompt listener
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }

    pwaManager.on('installPromptAvailable', handleInstallPromptAvailable);
    pwaManager.on('appInstalled', handleAppInstalled);
    pwaManager.on('installAccepted', handleInstallAccepted);

    // Check if install is available immediately
    if (pwaManager.canInstall() && autoShow && !isDismissed) {
      setShowPrompt(true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
      
      pwaManager.off('installPromptAvailable', handleInstallPromptAvailable);
      pwaManager.off('appInstalled', handleAppInstalled);
      pwaManager.off('installAccepted', handleInstallAccepted);
    };
  }, [pwaManager, autoShow, isDismissed]);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const result = await pwaManager.showInstallPrompt();
      
      if (result.outcome === 'accepted') {
        // Installation started, hide prompt
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Install failed:', error);
      
      // Show iOS instructions if on iOS
      if (pwaManager.getPlatform() === 'ios') {
        pwaManager.showIOSInstallInstructions();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    
    if (dismissible) {
      // Remember dismissal for 7 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      localStorage.setItem('fixly_install_dismissed', expiryDate.toISOString());
    }
  };

  const handleLater = () => {
    setShowPrompt(false);
    
    // Show again in 24 hours
    const laterDate = new Date();
    laterDate.setDate(laterDate.getDate() + 1);
    localStorage.setItem('fixly_install_dismissed', laterDate.toISOString());
  };

  // Don't show if already installed or not supported
  if (!appInfo || appInfo.isInstalled || !appInfo.isSupported) {
    return null;
  }

  // Don't show if dismissed and not dismissible
  if (isDismissed && !showPrompt) {
    return null;
  }

  const positionClasses = {
    top: 'top-4 left-4 right-4',
    bottom: 'bottom-4 left-4 right-4',
    center: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const themeClasses = {
    default: 'bg-white border border-gray-200 shadow-lg',
    dark: 'bg-gray-800 border border-gray-600 shadow-lg text-white',
    primary: 'bg-blue-600 text-white shadow-lg',
    success: 'bg-green-600 text-white shadow-lg'
  };

  if (!showPrompt) return null;

  return (
    <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
      <div className={`rounded-lg p-4 max-w-sm mx-auto ${themeClasses[theme]}`}>
        {/* App Icon and Info */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <img
              src="/icon-192x192.png"
              alt="Fixly"
              className="w-12 h-12 rounded-lg"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">
              Install Fixly App
            </h3>
            <p className="text-sm opacity-80 mt-1">
              Get the full experience with offline access, push notifications, and faster loading.
            </p>
          </div>
        </div>

        {/* Benefits List */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center text-sm opacity-80">
            <span className="mr-2">⚡</span>
            <span>Faster loading times</span>
          </div>
          <div className="flex items-center text-sm opacity-80">
            <span className="mr-2">📱</span>
            <span>Works offline</span>
          </div>
          <div className="flex items-center text-sm opacity-80">
            <span className="mr-2">🔔</span>
            <span>Push notifications</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-4">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className={`
              flex-1 px-4 py-2 rounded-md font-medium transition-colors
              ${theme === 'default' 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
              }
              ${isInstalling ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isInstalling ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Installing...
              </div>
            ) : (
              'Install'
            )}
          </button>
          
          {dismissible && (
            <>
              <button
                onClick={handleLater}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${theme === 'default'
                    ? 'text-gray-600 hover:text-gray-800'
                    : 'text-current opacity-60 hover:opacity-80'
                  }
                `}
              >
                Later
              </button>
              
              <button
                onClick={handleDismiss}
                className={`
                  p-2 rounded-md transition-colors
                  ${theme === 'default'
                    ? 'text-gray-400 hover:text-gray-600'
                    : 'text-current opacity-40 hover:opacity-60'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Platform-specific instructions */}
        {appInfo.platform === 'ios' && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-800">
              On iOS: Tap the share button <span className="font-mono">⬆️</span> and select "Add to Home Screen"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// iOS Installation Instructions Component
export const IOSInstallInstructions = ({ onClose }) => {
  const steps = [
    { icon: '⬆️', text: 'Tap the Share button at the bottom of your screen' },
    { icon: '➕', text: 'Scroll down and tap "Add to Home Screen"' },
    { icon: '✅', text: 'Tap "Add" to install Fixly on your home screen' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 m-4 max-w-sm">
        <div className="text-center mb-4">
          <img
            src="/icon-192x192.png"
            alt="Fixly"
            className="w-16 h-16 mx-auto rounded-lg mb-3"
          />
          <h3 className="text-lg font-semibold">Install Fixly</h3>
          <p className="text-sm text-gray-600">Follow these steps to install the app</p>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm">{step.icon}</span>
              </div>
              <p className="text-sm text-gray-700 pt-1">{step.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;