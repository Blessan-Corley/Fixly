// User Location Manager - Uses signup form city and preferences when GPS is denied
'use client';

import { getLocationErrorHandler } from './LocationErrorHandler';

class UserLocationManager {
  constructor() {
    this.userLocation = null;
    this.locationSource = null; // 'gps', 'ip', 'signup_form', 'manual', 'cached'
    this.eventEmitter = null;
    this.errorHandler = getLocationErrorHandler();
    this.locationPreferences = {
      allowGPS: true,
      allowIP: true,
      preferredCity: null,
      signupCity: null,
      signupLocation: null
    };
    
    if (typeof window !== 'undefined') {
      this.initEventEmitter();
      this.loadUserPreferences();
    }
  }

  initEventEmitter() {
    if (typeof EventTarget !== 'undefined') {
      this.eventEmitter = new EventTarget();
    } else {
      this.eventEmitter = document.createElement('div');
    }
  }

  // Load user location preferences from server/storage
  async loadUserPreferences() {
    try {
      // Try to get from localStorage first
      const stored = localStorage.getItem('fixly_location_preferences');
      if (stored) {
        this.locationPreferences = { ...this.locationPreferences, ...JSON.parse(stored) };
      }

      // Then get from server if user is logged in
      const response = await fetch('/api/user/location-preferences');
      if (response.ok) {
        const serverPrefs = await response.json();
        this.locationPreferences = { ...this.locationPreferences, ...serverPrefs };
        
        // Store in localStorage for offline access
        localStorage.setItem('fixly_location_preferences', JSON.stringify(this.locationPreferences));
      }
    } catch (error) {
      console.warn('Could not load user location preferences:', error);
    }
  }

  // Save user location preferences
  async saveLocationPreferences(preferences) {
    try {
      this.locationPreferences = { ...this.locationPreferences, ...preferences };
      
      // Save to localStorage
      localStorage.setItem('fixly_location_preferences', JSON.stringify(this.locationPreferences));
      
      // Save to server if user is logged in
      const response = await fetch('/api/user/location-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.locationPreferences)
      });

      if (response.ok) {
        this.emitEvent('preferencesUpdated', this.locationPreferences);
      }
    } catch (error) {
      console.warn('Could not save location preferences:', error);
    }
  }

  // Get user's current location with comprehensive fallback system
  async getUserLocation(options = {}) {
    const context = options.context || 'general';
    this.emitEvent('locationDetectionStarted', { context });

    // Priority order based on user preferences and availability
    const methods = this.getLocationMethodPriority();
    
    for (const method of methods) {
      try {
        this.emitEvent('locationMethodAttempt', { method });
        const result = await this.tryLocationMethod(method, options);
        
        if (this.isValidLocation(result)) {
          this.userLocation = {
            ...result,
            source: method,
            timestamp: Date.now(),
            context
          };
          this.locationSource = method;
          
          this.emitEvent('locationSuccess', { 
            location: this.userLocation, 
            method,
            context 
          });
          
          return this.userLocation;
        }
      } catch (error) {
        const processedError = this.errorHandler.processError(error, { 
          context, 
          method, 
          preferences: this.locationPreferences 
        });
        
        console.warn(`Location method ${method} failed:`, processedError);
        this.errorHandler.logError(processedError);
        
        this.emitEvent('locationMethodFailed', { 
          method, 
          error: processedError,
          userMessage: this.errorHandler.createUserErrorMessage(processedError)
        });
        continue;
      }
    }

    // If all methods fail, show location selection dialog
    return this.showLocationSelectionDialog();
  }

  // Determine location method priority based on user preferences and context
  getLocationMethodPriority() {
    const methods = [];
    
    // Add GPS if allowed
    if (this.locationPreferences.allowGPS) {
      methods.push('gps');
    }
    
    // Add signup form location if available
    if (this.locationPreferences.signupLocation) {
      methods.push('signup_form');
    }
    
    // Add preferred city if set
    if (this.locationPreferences.preferredCity) {
      methods.push('preferred_city');
    }
    
    // Add IP location if allowed
    if (this.locationPreferences.allowIP) {
      methods.push('ip_location');
    }
    
    // Add cached location
    methods.push('cached');
    
    // Add manual input as last resort
    methods.push('manual');
    
    return methods;
  }

  // Try individual location method
  async tryLocationMethod(method, options = {}) {
    switch (method) {
      case 'gps':
        return await this.getGPSLocation(options);
      
      case 'signup_form':
        return await this.getSignupFormLocation();
      
      case 'preferred_city':
        return await this.getPreferredCityLocation();
      
      case 'ip_location':
        return await this.getIPLocation();
      
      case 'cached':
        return await this.getCachedLocation();
      
      case 'manual':
        return await this.getManualLocation();
      
      default:
        throw new Error(`Unknown location method: ${method}`);
    }
  }

  // Method 1: GPS Location
  async getGPSLocation(options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
        ...options.geoOptions
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              method: 'gps',
              source: 'device_gps'
            };

            // Get address for GPS coordinates
            const address = await this.reverseGeocode(location.latitude, location.longitude);
            location.address = address;
            location.city = address.city;
            location.region = address.state;
            location.country = address.country;

            resolve(location);
          } catch (error) {
            // Even if reverse geocoding fails, return GPS coordinates
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              method: 'gps',
              source: 'device_gps'
            });
          }
        },
        (error) => {
          // Process GPS-specific error
          const processedError = this.errorHandler.processError(error, {
            context: 'gps_location',
            method: 'geolocation_api'
          });

          // Update preferences based on error type
          if (error.code === error.PERMISSION_DENIED) {
            this.saveLocationPreferences({ allowGPS: false });
          }

          // Emit detailed error information
          this.emitEvent('gpsLocationFailed', {
            error: processedError,
            userMessage: this.errorHandler.createUserErrorMessage(processedError)
          });

          reject(processedError.originalError);
        },
        geoOptions
      );
    });
  }

  // Method 2: Signup Form Location
  async getSignupFormLocation() {
    if (!this.locationPreferences.signupLocation) {
      throw new Error('No signup form location available');
    }

    const location = { ...this.locationPreferences.signupLocation };
    location.method = 'signup_form';
    location.source = 'user_registration';
    location.note = 'Location from signup form';

    return location;
  }

  // Method 3: Preferred City Location
  async getPreferredCityLocation() {
    if (!this.locationPreferences.preferredCity) {
      throw new Error('No preferred city set');
    }

    const location = await this.geocodeCity(this.locationPreferences.preferredCity);
    location.method = 'preferred_city';
    location.source = 'user_preference';
    location.note = 'User preferred city';

    return location;
  }

  // Method 4: IP Location
  async getIPLocation() {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error('IP location service unavailable');
    }

    const data = await response.json();
    if (!data.latitude || !data.longitude) {
      throw new Error('Invalid IP location data');
    }

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: 10000,
      city: data.city,
      region: data.region,
      country: data.country_name,
      address: {
        city: data.city,
        state: data.region,
        country: data.country_name,
        formatted: `${data.city}, ${data.region}, ${data.country_name}`
      },
      method: 'ip_location',
      source: 'ip_geolocation'
    };
  }

  // Method 5: Cached Location
  async getCachedLocation() {
    const cached = localStorage.getItem('fixly_user_location');
    if (!cached) {
      throw new Error('No cached location available');
    }

    const location = JSON.parse(cached);
    
    // Check if cached location is not too old (24 hours)
    if (Date.now() - location.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('fixly_user_location');
      throw new Error('Cached location too old');
    }

    location.method = 'cached';
    location.source = 'local_cache';
    return location;
  }

  // Method 6: Manual Location Input
  async getManualLocation() {
    return new Promise((resolve, reject) => {
      this.emitEvent('manualLocationRequired', {
        onComplete: (location) => {
          if (location) {
            location.method = 'manual';
            location.source = 'user_input';
            resolve(location);
          } else {
            reject(new Error('Manual location input cancelled'));
          }
        }
      });
    });
  }

  // Show location selection dialog
  async showLocationSelectionDialog() {
    return new Promise((resolve) => {
      this.emitEvent('locationSelectionRequired', {
        availableOptions: this.getAvailableLocationOptions(),
        onLocationSelected: (location) => {
          location.method = 'user_selection';
          location.source = 'user_choice';
          resolve(location);
        }
      });
    });
  }

  // Get available location options for user selection
  getAvailableLocationOptions() {
    const options = [];
    
    if (this.locationPreferences.signupLocation) {
      options.push({
        type: 'signup_form',
        label: `${this.locationPreferences.signupLocation.city} (from signup)`,
        location: this.locationPreferences.signupLocation,
        icon: '📝'
      });
    }
    
    if (this.locationPreferences.preferredCity) {
      options.push({
        type: 'preferred_city',
        label: `${this.locationPreferences.preferredCity} (preferred)`,
        city: this.locationPreferences.preferredCity,
        icon: '⭐'
      });
    }
    
    options.push({
      type: 'ip_location',
      label: 'Auto-detect from internet connection',
      icon: '🌐'
    });
    
    options.push({
      type: 'manual',
      label: 'Enter location manually',
      icon: '✏️'
    });
    
    return options;
  }

  // Geocode a city name to coordinates
  async geocodeCity(cityName) {
    try {
      const response = await fetch('/api/location/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: cityName })
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy || 5000,
        city: data.city,
        region: data.region,
        country: data.country,
        address: {
          city: data.city,
          state: data.region,
          country: data.country,
          formatted: data.formatted_address
        }
      };
    } catch (error) {
      throw new Error(`Failed to geocode city: ${error.message}`);
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await fetch('/api/location/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude })
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      return data.address;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return {
        city: 'Unknown Location',
        state: '',
        country: '',
        formatted: 'Location unavailable'
      };
    }
  }

  // Set user's signup location (called during registration)
  setSignupLocation(locationData) {
    this.locationPreferences.signupLocation = locationData;
    this.locationPreferences.signupCity = locationData.city;
    this.saveLocationPreferences(this.locationPreferences);
    
    this.emitEvent('signupLocationSet', locationData);
  }

  // Update user's preferred city
  setPreferredCity(cityName) {
    this.locationPreferences.preferredCity = cityName;
    this.saveLocationPreferences(this.locationPreferences);
    
    this.emitEvent('preferredCitySet', { city: cityName });
  }

  // Get current location info
  getCurrentLocationInfo() {
    return {
      location: this.userLocation,
      source: this.locationSource,
      preferences: this.locationPreferences,
      timestamp: this.userLocation?.timestamp
    };
  }

  // Update GPS permission status
  updateGPSPermission(allowed) {
    this.locationPreferences.allowGPS = allowed;
    this.saveLocationPreferences(this.locationPreferences);
    
    this.emitEvent('gpsPermissionChanged', { allowed });
  }

  // Get location for nearby jobs with appropriate fallbacks
  async getLocationForNearbyJobs() {
    try {
      const location = await this.getUserLocation({ context: 'nearby_jobs' });
      
      // Cache for nearby jobs feature
      localStorage.setItem('fixly_user_location', JSON.stringify(location));
      
      return location;
    } catch (error) {
      // If location completely fails, use a default location
      console.warn('Location detection failed for nearby jobs:', error);
      
      // Try to use signup location or show selection
      if (this.locationPreferences.signupLocation) {
        return {
          ...this.locationPreferences.signupLocation,
          method: 'signup_fallback',
          source: 'fallback_registration',
          note: 'Using signup location as fallback'
        };
      }
      
      throw error;
    }
  }

  // Validate location data
  isValidLocation(location) {
    return location && 
           typeof location.latitude === 'number' &&
           typeof location.longitude === 'number' &&
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180;
  }

  // Format location for display
  formatLocationDisplay(location) {
    if (!location) return 'No location';
    
    let display = '';
    let source = '';
    
    if (location.city && location.region) {
      display = `${location.city}, ${location.region}`;
    } else if (location.city) {
      display = location.city;
    } else if (location.address?.formatted) {
      display = location.address.formatted;
    } else {
      display = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    
    switch (location.source) {
      case 'device_gps':
        source = 'Current location';
        break;
      case 'user_registration':
        source = 'From signup form';
        break;
      case 'user_preference':
        source = 'Preferred city';
        break;
      case 'ip_geolocation':
        source = 'Auto-detected';
        break;
      case 'local_cache':
        source = 'Recent location';
        break;
      case 'user_input':
        source = 'Manually entered';
        break;
      default:
        source = location.method || 'Unknown';
    }
    
    return { display, source };
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
  }
}

// Singleton instance
let userLocationManager = null;

export const getUserLocationManager = () => {
  if (!userLocationManager) {
    userLocationManager = new UserLocationManager();
  }
  return userLocationManager;
};

export default UserLocationManager;