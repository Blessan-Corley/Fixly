'use client';

class PWAManager {
  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
    this.isInstalled = this.checkIfInstalled();
    this.installPromptEvent = null;
    this.eventEmitter = null;
    this.updateAvailable = false;
    this.registration = null;
    
    if (this.isSupported) {
      this.initEventEmitter();
      this.setupEventListeners();
      this.checkForUpdates();
    }
  }

  initEventEmitter() {
    if (typeof EventTarget !== 'undefined') {
      this.eventEmitter = new EventTarget();
    } else {
      this.eventEmitter = document.createElement('div');
    }
  }

  // Setup PWA event listeners
  setupEventListeners() {
    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPromptEvent = event;
      this.emitEvent('installPromptAvailable', { event });
    });

    // Handle successful installation
    window.addEventListener('appinstalled', (event) => {
      this.isInstalled = true;
      this.installPromptEvent = null;
      this.emitEvent('appInstalled', { event });
      this.trackInstallation();
    });

    // Handle service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      // Listen for service worker registration updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.emitEvent('serviceWorkerUpdated');
        window.location.reload();
      });
    }

    // Handle network status changes
    window.addEventListener('online', () => {
      this.emitEvent('networkOnline');
    });

    window.addEventListener('offline', () => {
      this.emitEvent('networkOffline');
    });

    // Handle visibility changes for background sync
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates();
        this.emitEvent('appVisible');
      } else {
        this.emitEvent('appHidden');
      }
    });
  }

  // Check if app is installed
  checkIfInstalled() {
    if (typeof window === 'undefined') return false;
    
    // Check for various installation indicators
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  // Check if install prompt is available
  canInstall() {
    return !this.isInstalled && this.installPromptEvent !== null;
  }

  // Show install prompt
  async showInstallPrompt() {
    if (!this.installPromptEvent) {
      throw new Error('Install prompt not available');
    }

    try {
      const result = await this.installPromptEvent.prompt();
      this.emitEvent('installPromptShown', { result });

      if (result.outcome === 'accepted') {
        this.emitEvent('installAccepted');
        this.installPromptEvent = null;
      } else {
        this.emitEvent('installDismissed');
      }

      return result;
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      throw error;
    }
  }

  // Register service worker with advanced features
  async registerServiceWorker(swUrl = '/sw.js') {
    if (!this.isSupported) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      // Handle registration states
      if (this.registration.installing) {
        this.emitEvent('serviceWorkerInstalling', { registration: this.registration });
      }

      if (this.registration.waiting) {
        this.updateAvailable = true;
        this.emitEvent('serviceWorkerWaiting', { registration: this.registration });
      }

      if (this.registration.active) {
        this.emitEvent('serviceWorkerActive', { registration: this.registration });
      }

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          switch (newWorker.state) {
            case 'installed':
              if (navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.emitEvent('updateAvailable', { registration: this.registration });
              }
              break;
            case 'activated':
              this.emitEvent('updateActivated');
              break;
          }
        });
      });

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Apply pending update
  async applyUpdate() {
    if (!this.registration || !this.registration.waiting) {
      throw new Error('No update available');
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Check for service worker updates
  async checkForUpdates() {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.warn('Failed to check for updates:', error);
    }
  }

  // Handle service worker messages
  handleServiceWorkerMessage(event) {
    const { type, payload } = event.data || {};

    switch (type) {
      case 'UPDATE_AVAILABLE':
        this.updateAvailable = true;
        this.emitEvent('updateAvailable', payload);
        break;
      
      case 'CACHE_UPDATED':
        this.emitEvent('cacheUpdated', payload);
        break;
      
      case 'OFFLINE_READY':
        this.emitEvent('offlineReady', payload);
        break;
      
      case 'SYNC_SUCCESS':
        this.emitEvent('syncSuccess', payload);
        break;
      
      case 'SYNC_FAILED':
        this.emitEvent('syncFailed', payload);
        break;

      case 'NOTIFICATION_CLICKED':
        this.emitEvent('notificationClicked', payload);
        break;

      default:
        console.log('Unknown service worker message:', event.data);
    }
  }

  // Get app capabilities and status
  getAppInfo() {
    return {
      isSupported: this.isSupported,
      isInstalled: this.isInstalled,
      canInstall: this.canInstall(),
      hasServiceWorker: !!this.registration,
      updateAvailable: this.updateAvailable,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      displayMode: this.getDisplayMode(),
      platform: this.getPlatform()
    };
  }

  // Get current display mode
  getDisplayMode() {
    if (typeof window === 'undefined') return 'browser';
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    }
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    }
    return 'browser';
  }

  // Get platform information
  getPlatform() {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('windows')) return 'windows';
    if (userAgent.includes('macintosh')) return 'macos';
    if (userAgent.includes('linux')) return 'linux';
    
    return 'unknown';
  }

  // Share content using native Web Share API
  async share(shareData) {
    if (!navigator.share) {
      throw new Error('Web Share API not supported');
    }

    try {
      await navigator.share(shareData);
      this.emitEvent('shareSuccess', { shareData });
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        this.emitEvent('shareFailed', { error, shareData });
      }
      return false;
    }
  }

  // Add to home screen (for iOS Safari)
  showIOSInstallInstructions() {
    if (this.getPlatform() !== 'ios') return false;

    const instructions = {
      title: 'Install Fixly',
      steps: [
        'Tap the Share button',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to install the app'
      ],
      icon: '⬆️'
    };

    this.emitEvent('showIOSInstructions', instructions);
    return true;
  }

  // Track installation for analytics
  trackInstallation() {
    const installData = {
      timestamp: new Date(),
      platform: this.getPlatform(),
      displayMode: this.getDisplayMode(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    };

    // Store install data
    try {
      localStorage.setItem('fixly_install_data', JSON.stringify(installData));
    } catch (error) {
      console.warn('Failed to store install data:', error);
    }

    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        platform: installData.platform,
        display_mode: installData.displayMode
      });
    }

    this.emitEvent('installTracked', installData);
  }

  // Configure app shortcuts (for supported browsers)
  async setAppShortcuts(shortcuts) {
    if (!navigator.setAppBadge) {
      console.warn('App shortcuts not supported');
      return false;
    }

    try {
      // This would be implemented when browser support is available
      console.log('App shortcuts configured:', shortcuts);
      return true;
    } catch (error) {
      console.error('Failed to set app shortcuts:', error);
      return false;
    }
  }

  // Set app badge (for supported browsers)
  async setAppBadge(count = 0) {
    if (!navigator.setAppBadge) {
      return false;
    }

    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
      this.emitEvent('badgeUpdated', { count });
      return true;
    } catch (error) {
      console.error('Failed to set app badge:', error);
      return false;
    }
  }

  // Clear app badge
  async clearAppBadge() {
    return await this.setAppBadge(0);
  }

  // Wake lock API (keep screen on)
  async requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      throw new Error('Wake Lock API not supported');
    }

    try {
      const wakeLock = await navigator.wakeLock.request('screen');
      this.emitEvent('wakeLockAcquired', { wakeLock });
      return wakeLock;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      throw error;
    }
  }

  // Event handling
  on(event, callback) {
    if (this.eventEmitter) {
      this.eventEmitter.addEventListener(event, callback);
    }
  }

  off(event, callback) {
    if (this.eventEmitter) {
      this.eventEmitter.removeEventListener(event, callback);
    }
  }

  emitEvent(eventName, data = {}) {
    if (this.eventEmitter) {
      const event = new CustomEvent(eventName, { detail: data });
      this.eventEmitter.dispatchEvent(event);
    }
  }

  // Cleanup
  destroy() {
    this.eventEmitter = null;
    this.installPromptEvent = null;
  }
}

// Singleton instance
let pwaManager = null;

export const getPWAManager = () => {
  if (!pwaManager) {
    pwaManager = new PWAManager();
  }
  return pwaManager;
};

export default PWAManager;