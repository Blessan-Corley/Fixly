// Location Fallback Manager for when GPS/geolocation is denied or unavailable
'use client';

class LocationFallbackManager {
  constructor() {
    this.fallbackMethods = [
      'geolocation',
      'ipLocation',
      'citySearch',
      'manualInput',
      'savedLocation'
    ];
    this.currentMethod = null;
    this.locationCache = new Map();
    this.cityDatabase = null;
    this.eventEmitter = null;
    
    if (typeof window !== 'undefined') {
      this.initEventEmitter();
      this.loadCityDatabase();
    }
  }

  initEventEmitter() {
    if (typeof EventTarget !== 'undefined') {
      this.eventEmitter = new EventTarget();
    } else {
      this.eventEmitter = document.createElement('div');
    }
  }

  // Main method to get location with comprehensive fallbacks
  async getLocationWithFallbacks(options = {}) {
    const methods = options.methods || this.fallbackMethods;
    const context = options.context || 'general';
    
    this.emitEvent('locationAttemptStarted', { methods, context });

    for (const method of methods) {
      try {
        this.emitEvent('locationMethodAttempt', { method });
        const result = await this.tryLocationMethod(method, options);
        
        if (result && result.latitude && result.longitude) {
          this.currentMethod = method;
          this.cacheLocation(result, method);
          this.emitEvent('locationSuccess', { location: result, method, context });
          return result;
        }
      } catch (error) {
        console.warn(`Location method ${method} failed:`, error.message);
        this.emitEvent('locationMethodFailed', { method, error: error.message });
        continue;
      }
    }

    // If all methods fail, try to get last known location
    const lastKnown = this.getLastKnownLocation();
    if (lastKnown) {
      this.emitEvent('locationFallbackUsed', { location: lastKnown, method: 'cached' });
      return lastKnown;
    }

    // Final fallback - show location selection UI
    return this.showLocationSelectionDialog();
  }

  // Try individual location method
  async tryLocationMethod(method, options = {}) {
    switch (method) {
      case 'geolocation':
        return await this.tryGeolocation(options);
      
      case 'ipLocation':
        return await this.tryIPLocation();
      
      case 'citySearch':
        return await this.tryCitySearch(options.cityQuery);
      
      case 'manualInput':
        return await this.tryManualInput();
      
      case 'savedLocation':
        return await this.trySavedLocation();
      
      default:
        throw new Error(`Unknown location method: ${method}`);
    }
  }

  // Method 1: Standard Geolocation API
  async tryGeolocation(options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      const geoOptions = {
        enableHighAccuracy: false, // More permissive for fallback
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options.geoOptions
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            method: 'geolocation',
            timestamp: Date.now()
          });
        },
        (error) => {
          let message = 'Geolocation failed';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timeout';
              break;
          }
          reject(new Error(message));
        },
        geoOptions
      );
    });
  }

  // Method 2: IP-based location
  async tryIPLocation() {
    try {
      // Try multiple IP location services
      const services = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'http://ip-api.com/json/'
      ];

      for (const serviceUrl of services) {
        try {
          const response = await fetch(serviceUrl, { timeout: 5000 });
          if (!response.ok) continue;
          
          const data = await response.json();
          
          // Different services have different response formats
          let lat, lng, city, region, country;
          
          if (serviceUrl.includes('ipapi.co')) {
            lat = data.latitude;
            lng = data.longitude;
            city = data.city;
            region = data.region;
            country = data.country_name;
          } else if (serviceUrl.includes('ip-api.com')) {
            lat = data.lat;
            lng = data.lon;
            city = data.city;
            region = data.regionName;
            country = data.country;
          }

          if (lat && lng) {
            return {
              latitude: lat,
              longitude: lng,
              accuracy: 10000, // IP location is less accurate
              city,
              region,
              country,
              method: 'ip_location',
              service: serviceUrl,
              timestamp: Date.now()
            };
          }
        } catch (error) {
          console.warn(`IP service ${serviceUrl} failed:`, error);
          continue;
        }
      }

      throw new Error('All IP location services failed');
    } catch (error) {
      throw new Error(`IP location failed: ${error.message}`);
    }
  }

  // Method 3: City search and geocoding
  async tryCitySearch(cityQuery) {
    if (!cityQuery) {
      throw new Error('No city query provided');
    }

    try {
      // First try our city database for quick lookup
      const localResult = this.searchLocalCityDatabase(cityQuery);
      if (localResult) {
        return localResult;
      }

      // If not found locally, use geocoding API
      const response = await fetch('/api/location/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: cityQuery })
      });

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 5000,
        city: data.city,
        region: data.region,
        country: data.country,
        address: data.formatted_address,
        method: 'city_search',
        query: cityQuery,
        timestamp: Date.now()
      };

    } catch (error) {
      throw new Error(`City search failed: ${error.message}`);
    }
  }

  // Method 4: Manual location input dialog
  async tryManualInput() {
    return new Promise((resolve, reject) => {
      // This would typically show a UI dialog
      // For now, we'll emit an event that the UI can listen to
      this.emitEvent('manualInputRequired', {
        onComplete: (location) => {
          if (location) {
            resolve({
              ...location,
              method: 'manual_input',
              timestamp: Date.now()
            });
          } else {
            reject(new Error('Manual input cancelled'));
          }
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Manual input timeout'));
      }, 30000);
    });
  }

  // Method 5: Previously saved location
  async trySavedLocation() {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Not in browser environment');
      }

      const saved = localStorage.getItem('fixly_saved_location');
      if (!saved) {
        throw new Error('No saved location found');
      }

      const location = JSON.parse(saved);
      
      // Check if saved location is not too old (7 days)
      if (Date.now() - location.timestamp > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('fixly_saved_location');
        throw new Error('Saved location too old');
      }

      return {
        ...location,
        method: 'saved_location',
        fromCache: true
      };

    } catch (error) {
      throw new Error(`Saved location failed: ${error.message}`);
    }
  }

  // Show location selection dialog
  async showLocationSelectionDialog() {
    return new Promise((resolve) => {
      this.emitEvent('locationSelectionRequired', {
        onLocationSelected: (location) => {
          resolve({
            ...location,
            method: 'user_selection',
            timestamp: Date.now()
          });
        }
      });
    });
  }

  // Search local city database
  searchLocalCityDatabase(query) {
    if (!this.cityDatabase || !query) return null;

    const normalizedQuery = query.toLowerCase().trim();
    
    // Search for exact matches first
    let match = this.cityDatabase.find(city => 
      city.name.toLowerCase() === normalizedQuery ||
      city.fullName.toLowerCase() === normalizedQuery
    );

    // If no exact match, try partial matches
    if (!match) {
      match = this.cityDatabase.find(city => 
        city.name.toLowerCase().includes(normalizedQuery) ||
        city.fullName.toLowerCase().includes(normalizedQuery)
      );
    }

    if (match) {
      return {
        latitude: match.latitude,
        longitude: match.longitude,
        accuracy: 5000,
        city: match.name,
        region: match.region,
        country: match.country,
        method: 'local_database',
        timestamp: Date.now()
      };
    }

    return null;
  }

  // Load city database for offline search
  async loadCityDatabase() {
    try {
      // This would typically load from a local file or API
      // For now, we'll use a small sample database
      this.cityDatabase = [
        { name: 'New York', fullName: 'New York, NY, USA', latitude: 40.7128, longitude: -74.0060, region: 'NY', country: 'USA' },
        { name: 'Los Angeles', fullName: 'Los Angeles, CA, USA', latitude: 34.0522, longitude: -118.2437, region: 'CA', country: 'USA' },
        { name: 'Chicago', fullName: 'Chicago, IL, USA', latitude: 41.8781, longitude: -87.6298, region: 'IL', country: 'USA' },
        { name: 'Houston', fullName: 'Houston, TX, USA', latitude: 29.7604, longitude: -95.3698, region: 'TX', country: 'USA' },
        { name: 'Phoenix', fullName: 'Phoenix, AZ, USA', latitude: 33.4484, longitude: -112.0740, region: 'AZ', country: 'USA' },
        { name: 'Philadelphia', fullName: 'Philadelphia, PA, USA', latitude: 39.9526, longitude: -75.1652, region: 'PA', country: 'USA' },
        { name: 'San Antonio', fullName: 'San Antonio, TX, USA', latitude: 29.4241, longitude: -98.4936, region: 'TX', country: 'USA' },
        { name: 'San Diego', fullName: 'San Diego, CA, USA', latitude: 32.7157, longitude: -117.1611, region: 'CA', country: 'USA' },
        { name: 'Dallas', fullName: 'Dallas, TX, USA', latitude: 32.7767, longitude: -96.7970, region: 'TX', country: 'USA' },
        { name: 'San Jose', fullName: 'San Jose, CA, USA', latitude: 37.3382, longitude: -121.8863, region: 'CA', country: 'USA' }
      ];
      
      console.log('City database loaded with', this.cityDatabase.length, 'cities');
    } catch (error) {
      console.error('Failed to load city database:', error);
      this.cityDatabase = [];
    }
  }

  // Cache location for future use
  cacheLocation(location, method) {
    const key = `${method}_${Date.now()}`;
    this.locationCache.set(key, location);
    
    // Also save to localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fixly_last_location', JSON.stringify(location));
        localStorage.setItem('fixly_saved_location', JSON.stringify(location));
      } catch (error) {
        console.warn('Failed to save location to localStorage:', error);
      }
    }
  }

  // Get last known location
  getLastKnownLocation() {
    // First check memory cache
    if (this.locationCache.size > 0) {
      const entries = Array.from(this.locationCache.entries());
      const latest = entries.sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
      return latest[1];
    }

    // Then check localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fixly_last_location');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (error) {
        console.warn('Failed to load last known location:', error);
      }
    }

    return null;
  }

  // Get location suggestions based on user input
  getLocationSuggestions(query, limit = 10) {
    if (!query || !this.cityDatabase) return [];

    const normalizedQuery = query.toLowerCase().trim();
    
    return this.cityDatabase
      .filter(city => 
        city.name.toLowerCase().includes(normalizedQuery) ||
        city.fullName.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, limit)
      .map(city => ({
        name: city.name,
        fullName: city.fullName,
        region: city.region,
        country: city.country
      }));
  }

  // Validate location data
  isValidLocation(location) {
    return location && 
           typeof location.latitude === 'number' &&
           typeof location.longitude === 'number' &&
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180;
  }

  // Get location method priority based on user preferences
  getMethodPriority(userPreferences = {}) {
    const defaultPriority = ['geolocation', 'savedLocation', 'ipLocation', 'citySearch', 'manualInput'];
    
    if (userPreferences.preferIP) {
      return ['ipLocation', 'savedLocation', 'geolocation', 'citySearch', 'manualInput'];
    }
    
    if (userPreferences.disableGeolocation) {
      return ['savedLocation', 'ipLocation', 'citySearch', 'manualInput'];
    }
    
    return defaultPriority;
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

  // Get fallback status
  getStatus() {
    return {
      currentMethod: this.currentMethod,
      availableMethods: this.fallbackMethods,
      cacheSize: this.locationCache.size,
      hasCityDatabase: !!this.cityDatabase?.length,
      lastKnown: this.getLastKnownLocation()
    };
  }

  // Clear cache
  clearCache() {
    this.locationCache.clear();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('fixly_last_location');
        localStorage.removeItem('fixly_saved_location');
      } catch (error) {
        console.warn('Failed to clear location cache:', error);
      }
    }
  }
}

// Singleton instance
let fallbackManager = null;

export const getLocationFallbackManager = () => {
  if (!fallbackManager) {
    fallbackManager = new LocationFallbackManager();
  }
  return fallbackManager;
};

export default LocationFallbackManager;