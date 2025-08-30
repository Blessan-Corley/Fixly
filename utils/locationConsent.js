// utils/locationConsent.js - Comprehensive location consent management
import { toast } from 'sonner';

export const CONSENT_STORAGE_KEY = 'fixly_location_consent';
export const CONSENT_VERSION = '2.0';

export const ConsentTypes = {
  BASIC_LOCATION: 'basic_location',
  PRECISE_LOCATION: 'precise_location', 
  BACKGROUND_UPDATES: 'background_updates',
  LOCATION_HISTORY: 'location_history',
  JOB_MATCHING: 'job_matching',
  ANALYTICS: 'location_analytics'
};

export const ConsentStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  PENDING: 'pending',
  REVOKED: 'revoked',
  EXPIRED: 'expired'
};

class LocationConsentManager {
  constructor() {
    this.consentData = this.loadConsentData();
    this.listeners = new Set();
  }

  // Load consent data from storage
  loadConsentData() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return this.getDefaultConsent();
      }
      
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) return this.getDefaultConsent();
      
      const data = JSON.parse(stored);
      
      // Check if consent version is current
      if (data.version !== CONSENT_VERSION) {
        console.log('Location consent version outdated, requiring re-consent');
        return this.getDefaultConsent();
      }

      // Check if consent has expired (1 year)
      const consentAge = Date.now() - new Date(data.timestamp).getTime();
      if (consentAge > 365 * 24 * 60 * 60 * 1000) {
        console.log('Location consent expired, requiring re-consent');
        return this.getDefaultConsent();
      }

      return data;
    } catch (error) {
      console.error('Error loading location consent:', error);
      return this.getDefaultConsent();
    }
  }

  // Get default consent structure
  getDefaultConsent() {
    return {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      userId: null,
      consents: {
        [ConsentTypes.BASIC_LOCATION]: { 
          status: ConsentStatus.PENDING,
          timestamp: null,
          description: 'Allow Fixly to access your approximate location for job matching'
        },
        [ConsentTypes.PRECISE_LOCATION]: { 
          status: ConsentStatus.PENDING,
          timestamp: null,
          description: 'Allow Fixly to access your precise location for accurate distance calculations'
        },
        [ConsentTypes.BACKGROUND_UPDATES]: { 
          status: ConsentStatus.PENDING,
          timestamp: null,
          description: 'Allow Fixly to update your location automatically in the background'
        },
        [ConsentTypes.LOCATION_HISTORY]: { 
          status: ConsentStatus.PENDING,
          timestamp: null,
          description: 'Allow Fixly to store your location history for improved recommendations'
        },
        [ConsentTypes.JOB_MATCHING]: { 
          status: ConsentStatus.PENDING,
          timestamp: null,
          description: 'Use your location to match you with nearby job opportunities'
        },
        [ConsentTypes.ANALYTICS]: { 
          status: ConsentStatus.PENDING,
          timestamp: null,
          description: 'Use anonymized location data to improve our services'
        }
      },
      deviceInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
        language: typeof navigator !== 'undefined' ? navigator.language : ''
      }
    };
  }

  // Save consent data to storage
  saveConsentData(data = this.consentData) {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        this.consentData = data;
        this.notifyListeners('updated', data);
        return true; // Return true to allow operation to continue
      }
      
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(data));
      this.consentData = data;
      this.notifyListeners('updated', data);
      return true;
    } catch (error) {
      console.error('Error saving location consent:', error);
      return false;
    }
  }

  // Grant consent for specific type
  grantConsent(consentType, userId = null) {
    if (!Object.values(ConsentTypes).includes(consentType)) {
      throw new Error(`Invalid consent type: ${consentType}`);
    }

    const now = new Date().toISOString();
    
    this.consentData.consents[consentType] = {
      ...this.consentData.consents[consentType],
      status: ConsentStatus.GRANTED,
      timestamp: now
    };
    
    this.consentData.timestamp = now;
    if (userId) this.consentData.userId = userId;

    const saved = this.saveConsentData();
    
    if (saved) {
      console.log(`✅ Location consent granted: ${consentType}`);
      this.notifyListeners('granted', { type: consentType, data: this.consentData });
      
      // Show appropriate toast
      const messages = {
        [ConsentTypes.BASIC_LOCATION]: 'Basic location access granted',
        [ConsentTypes.PRECISE_LOCATION]: 'Precise location access granted',
        [ConsentTypes.BACKGROUND_UPDATES]: 'Background location updates enabled',
        [ConsentTypes.JOB_MATCHING]: 'Location-based job matching enabled',
        [ConsentTypes.ANALYTICS]: 'Location analytics enabled'
      };
      
      toast.success(messages[consentType] || 'Location consent updated');
    }

    return saved;
  }

  // Deny consent for specific type
  denyConsent(consentType) {
    if (!Object.values(ConsentTypes).includes(consentType)) {
      throw new Error(`Invalid consent type: ${consentType}`);
    }

    const now = new Date().toISOString();
    
    this.consentData.consents[consentType] = {
      ...this.consentData.consents[consentType],
      status: ConsentStatus.DENIED,
      timestamp: now
    };
    
    this.consentData.timestamp = now;

    const saved = this.saveConsentData();
    
    if (saved) {
      console.log(`❌ Location consent denied: ${consentType}`);
      this.notifyListeners('denied', { type: consentType, data: this.consentData });
    }

    return saved;
  }

  // Revoke consent for specific type
  revokeConsent(consentType) {
    if (!Object.values(ConsentTypes).includes(consentType)) {
      throw new Error(`Invalid consent type: ${consentType}`);
    }

    const now = new Date().toISOString();
    
    this.consentData.consents[consentType] = {
      ...this.consentData.consents[consentType],
      status: ConsentStatus.REVOKED,
      timestamp: now
    };
    
    this.consentData.timestamp = now;

    const saved = this.saveConsentData();
    
    if (saved) {
      console.log(`🚫 Location consent revoked: ${consentType}`);
      this.notifyListeners('revoked', { type: consentType, data: this.consentData });
      toast.info('Location consent revoked. You can re-enable anytime in settings.');
    }

    return saved;
  }

  // Check if consent is granted for specific type
  hasConsent(consentType) {
    if (!Object.values(ConsentTypes).includes(consentType)) {
      return false;
    }
    
    const consent = this.consentData.consents[consentType];
    return consent && consent.status === ConsentStatus.GRANTED;
  }

  // Check if any location consent is granted
  hasAnyLocationConsent() {
    return this.hasConsent(ConsentTypes.BASIC_LOCATION) || 
           this.hasConsent(ConsentTypes.PRECISE_LOCATION);
  }

  // Get all granted consents
  getGrantedConsents() {
    return Object.entries(this.consentData.consents)
      .filter(([_, consent]) => consent.status === ConsentStatus.GRANTED)
      .map(([type, _]) => type);
  }

  // Get consent summary
  getConsentSummary() {
    const summary = {
      hasBasicLocation: this.hasConsent(ConsentTypes.BASIC_LOCATION),
      hasPreciseLocation: this.hasConsent(ConsentTypes.PRECISE_LOCATION),
      hasBackgroundUpdates: this.hasConsent(ConsentTypes.BACKGROUND_UPDATES),
      hasLocationHistory: this.hasConsent(ConsentTypes.LOCATION_HISTORY),
      hasJobMatching: this.hasConsent(ConsentTypes.JOB_MATCHING),
      hasAnalytics: this.hasConsent(ConsentTypes.ANALYTICS),
      version: this.consentData.version,
      lastUpdated: this.consentData.timestamp
    };

    return summary;
  }

  // Grant essential consents for basic functionality
  grantEssentialConsents(userId = null) {
    const essential = [
      ConsentTypes.BASIC_LOCATION,
      ConsentTypes.JOB_MATCHING
    ];

    let allGranted = true;
    
    essential.forEach(type => {
      if (!this.grantConsent(type, userId)) {
        allGranted = false;
      }
    });

    if (allGranted) {
      toast.success('Essential location permissions granted');
    }

    return allGranted;
  }

  // Grant all consents
  grantAllConsents(userId = null) {
    let allGranted = true;
    
    Object.values(ConsentTypes).forEach(type => {
      if (!this.grantConsent(type, userId)) {
        allGranted = false;
      }
    });

    return allGranted;
  }

  // Revoke all consents
  revokeAllConsents() {
    Object.values(ConsentTypes).forEach(type => {
      this.revokeConsent(type);
    });
    
    // Clear location data from localStorage (only in browser)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const locationKeys = ['userLocation', 'locationPermissionDenied', 'locationUpdate'];
      locationKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    }

    toast.info('All location permissions revoked');
    return true;
  }

  // Sync with server
  async syncWithServer() {
    try {
      const response = await fetch('/api/location/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.consentData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Location consent synced with server');
        return data;
      } else {
        console.warn('Failed to sync location consent with server');
        return null;
      }
    } catch (error) {
      console.error('Error syncing location consent:', error);
      return null;
    }
  }

  // Add event listener
  addEventListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Location consent listener error:', error);
      }
    });
  }

  // Get user-friendly consent status
  getConsentStatusText(consentType) {
    if (!this.consentData.consents[consentType]) return 'Unknown';
    
    const status = this.consentData.consents[consentType].status;
    const statusText = {
      [ConsentStatus.GRANTED]: 'Allowed',
      [ConsentStatus.DENIED]: 'Denied',
      [ConsentStatus.PENDING]: 'Not Set',
      [ConsentStatus.REVOKED]: 'Revoked',
      [ConsentStatus.EXPIRED]: 'Expired'
    };

    return statusText[status] || 'Unknown';
  }

  // Check if needs re-consent
  needsReConsent() {
    const hasAnyDenied = Object.values(this.consentData.consents)
      .some(consent => consent.status === ConsentStatus.DENIED);
    
    const hasExpired = Object.values(this.consentData.consents)
      .some(consent => consent.status === ConsentStatus.EXPIRED);

    return hasAnyDenied || hasExpired || this.consentData.version !== CONSENT_VERSION;
  }

  // Reset all consents to pending (for re-consent)
  resetConsents() {
    Object.keys(this.consentData.consents).forEach(type => {
      this.consentData.consents[type] = {
        ...this.consentData.consents[type],
        status: ConsentStatus.PENDING,
        timestamp: null
      };
    });

    this.consentData.version = CONSENT_VERSION;
    this.consentData.timestamp = new Date().toISOString();
    
    return this.saveConsentData();
  }
}

// Create singleton instance
export const locationConsentManager = new LocationConsentManager();

// Export convenience functions
export const hasLocationConsent = (type) => locationConsentManager.hasConsent(type);
export const grantLocationConsent = (type, userId) => locationConsentManager.grantConsent(type, userId);
export const denyLocationConsent = (type) => locationConsentManager.denyConsent(type);
export const revokeLocationConsent = (type) => locationConsentManager.revokeConsent(type);
export const getLocationConsentSummary = () => locationConsentManager.getConsentSummary();