// utils/locationManager.js - Comprehensive location management utility
import { toast } from 'sonner';

export class LocationManager {
  constructor() {
    this.isLocationSupported = 'geolocation' in navigator;
    this.currentLocation = null;
    this.watchId = null;
    this.lastUpdate = null;
    this.updateCallbacks = new Set();
    this.errorCallbacks = new Set();
    this.backgroundUpdateInterval = null;
  }

  // Check if location services are available
  isSupported() {
    return this.isLocationSupported;
  }

  // Get current location with comprehensive error handling
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
      silent: false,
      ...options
    };

    if (!this.isLocationSupported) {
      const error = new Error('Geolocation is not supported by this browser');
      if (!defaultOptions.silent) {
        toast.error('Location services not available on this device');
      }
      throw error;
    }

    try {
      const position = await this.getPositionPromise(defaultOptions);
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp),
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed
      };

      this.currentLocation = location;
      this.lastUpdate = new Date();
      this.notifyCallbacks('update', location);

      return location;
    } catch (error) {
      this.handleLocationError(error, defaultOptions.silent);
      throw error;
    }
  }

  // Promise wrapper for navigator.geolocation.getCurrentPosition
  getPositionPromise(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  // Handle location errors with user-friendly messages
  handleLocationError(error, silent = false) {
    let message = 'Unable to get your location';
    let showToast = !silent;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied. Please enable location services in your browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable. Please check your GPS settings.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
      default:
        message = `Location error: ${error.message}`;
        break;
    }

    if (showToast) {
      toast.error(message);
    }

    this.notifyCallbacks('error', { error, message });
  }

  // Start watching location with automatic updates - optimized for minimal UI impact
  startWatching(options = {}) {
    if (!this.isLocationSupported) {
      throw new Error('Geolocation not supported');
    }

    if (this.watchId) {
      this.stopWatching();
    }

    const watchOptions = {
      enableHighAccuracy: false, // Changed to false for less battery drain
      timeout: 30000, // Increased timeout
      maximumAge: 300000, // 5 minutes cache - increased from 1 minute
      ...options
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        };

        // Only update if location has changed significantly (larger threshold for watching)
        if (this.hasLocationChanged(location, 100)) { // Increased threshold from 50 to 100 meters
          this.currentLocation = location;
          this.lastUpdate = new Date();
          
          // Only notify callbacks if not in silent mode
          if (!options.silent) {
            this.notifyCallbacks('update', location);
          }
          
          // Auto-save to server if enabled - always silent for watching
          if (options.autoSave !== false) {
            this.saveLocationToServer(location, { 
              source: 'continuous_gps', 
              silent: true,
              backgroundUpdate: true 
            }).catch(error => {
              console.debug('Silent location save failed:', error);
            });
          }
          
          console.debug('Location watch updated (silent)');
        }
      },
      (error) => {
        console.debug('Location watch error:', error);
        // Always silent for watch errors to prevent UI disruption
        this.handleLocationError(error, true);
      },
      watchOptions
    );

    console.debug('Location watching started (optimized mode)');
    return this.watchId;
  }

  // Stop watching location
  stopWatching() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Check if location has changed significantly (1m precision tracking with 10m threshold)
  hasLocationChanged(newLocation, threshold = 10) {
    if (!this.currentLocation) return true;

    const distance = this.calculateDistance(
      this.currentLocation.lat,
      this.currentLocation.lng,
      newLocation.lat,
      newLocation.lng
    );

    // For 1-meter precision tracking, use smaller threshold and interval
    const timeDiff = new Date() - this.lastUpdate;
    const minUpdateInterval = 15000; // 15 seconds minimum for high-precision tracking
    
    // Allow more frequent updates for significant movements
    if (timeDiff < minUpdateInterval && distance < threshold) {
      return false; // Too frequent update for small distance change
    }

    return distance > threshold; // 10 meters threshold for 1m precision updates
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Optimize location precision for maximum accuracy (1m precision)
  optimizeLocationPrecision(location) {
    // Round coordinates to 6 decimal places for ~1 meter precision
    // This provides maximum practical accuracy for location tracking
    const precision = 6; // ~1.1 meters precision at equator
    const latPrecisionMeters = Math.round(111320 * Math.cos(location.lat * Math.PI / 180) / Math.pow(10, precision));
    
    return {
      ...location,
      lat: parseFloat(location.lat.toFixed(precision)),
      lng: parseFloat(location.lng.toFixed(precision)),
      accuracy: location.accuracy ? Math.round(location.accuracy) : null,
      precisionLevel: `${latPrecisionMeters}m`, // Actual precision at this latitude
      coordinatePrecision: precision,
      highPrecision: true // Flag indicating this is high-precision location data
    };
  }

  // Get comprehensive location details with automatic address filling
  async getLocationDetails(lat, lng) {
    try {
      // Import geocoding service dynamically to avoid circular imports
      const { getAddressFromCoordinates } = await import('./geocodingService');
      
      // Get detailed address information
      const addressResult = await getAddressFromCoordinates(lat, lng, { silent: true });
      
      if (addressResult.success) {
        return {
          // Basic location info
          city: addressResult.city,
          state: addressResult.state,
          country: addressResult.country,
          pincode: addressResult.pincode,
          
          // Detailed address components
          formatted: addressResult.formatted,
          street: addressResult.street,
          area: addressResult.area,
          district: addressResult.district,
          
          // Metadata
          accuracy: addressResult.accuracy,
          service: addressResult.service,
          autoFilled: true,
          
          // Fallback address if formatted is too long
          address: addressResult.formatted.length > 100 
            ? `${addressResult.area || addressResult.city || lat.toFixed(4)}, ${addressResult.state || lng.toFixed(4)}` 
            : addressResult.formatted
        };
      } else {
        console.debug('Address lookup failed, using fallback:', addressResult.error);
        throw new Error(addressResult.error);
      }
    } catch (error) {
      console.debug('Geocoding failed, using coordinate fallback:', error);
      
      // Fallback to coordinates with basic info
      return {
        city: 'Unknown City',
        state: 'Unknown State', 
        country: 'India',
        pincode: null,
        formatted: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        street: null,
        area: null,
        district: null,
        accuracy: 'coordinates_only',
        service: 'fallback',
        autoFilled: false,
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      };
    }
  }

  // Save location to server - optimized for user-specific storage with precision optimization
  async saveLocationToServer(location, options = {}) {
    // Add debouncing for rapid successive calls
    if (this._lastSaveTime && (Date.now() - this._lastSaveTime) < 30000) {
      console.debug('Location save debounced - too frequent');
      return;
    }
    
    this._lastSaveTime = Date.now();
    
    try {
      // Optimize location precision to reduce storage size and improve performance
      const optimizedLocation = this.optimizeLocationPrecision(location);
      
      // Get location details for better searchability
      const locationDetails = await this.getLocationDetails(optimizedLocation.lat, optimizedLocation.lng);
      
      const response = await fetch('/api/location/manage', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          // Optimized coordinates with proper precision
          lat: optimizedLocation.lat,
          lng: optimizedLocation.lng,
          accuracy: optimizedLocation.accuracy,
          
          // Enhanced location details for better searchability
          address: {
            city: locationDetails.city,
            state: locationDetails.state,
            country: locationDetails.country,
            formatted: locationDetails.address
          },
          
          // User identification and tracking metadata
          source: options.source || 'gps',
          silent: options.silent || false,
          backgroundUpdate: options.backgroundUpdate || false,
          consent: true,
          timestamp: location.timestamp || new Date().toISOString(),
          
          // Additional metadata for optimization
          precision: 'optimized',
          storageVersion: '2.0' // For future data migration tracking
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Only show success message for user-initiated updates
        if (!options.silent && !options.backgroundUpdate) {
          toast.success('Location updated successfully');
        } else {
          console.debug('Location saved silently with user ID:', data.userId || 'unknown');
        }
        
        return data;
      } else {
        // Don't throw error for background updates to prevent cascading failures
        if (options.backgroundUpdate || options.silent) {
          console.debug('Silent location save failed:', response.statusText);
          return null;
        } else {
          throw new Error('Failed to save location');
        }
      }
    } catch (error) {
      // Always silent for background/silent updates
      if (!options.silent && !options.backgroundUpdate) {
        console.error('Location save error:', error);
        toast.error('Failed to save location');
      } else {
        console.debug('Silent location save failed:', error.message);
      }
      
      // Don't throw for background updates
      if (!options.backgroundUpdate && !options.silent) {
        throw error;
      }
      
      return null;
    }
  }

  // Start background location updates - truly silent and non-intrusive
  startBackgroundUpdates(intervalMinutes = 30) { // Increased from 10 to 30 minutes
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval);
    }

    // Only start background updates if we have a current location
    if (!this.currentLocation) {
      console.debug('No current location - skipping background updates');
      return;
    }

    this.backgroundUpdateInterval = setInterval(async () => {
      try {
        // Only update if current location is very stale (>30 minutes)
        if (!this.isLocationStale(30)) {
          console.debug('Location still fresh - skipping background update');
          return;
        }

        const location = await this.getCurrentLocation({ 
          silent: true,
          maximumAge: 1800000, // 30 minutes - much longer cache
          timeout: 5000 // Shorter timeout for background updates
        });
        
        // Only save if location has changed significantly (>100 meters for background)
        if (this.hasLocationChanged(location, 100)) {
          await this.saveLocationToServer(location, {
            source: 'background_gps',
            silent: true,
            backgroundUpdate: true
          });
          console.debug('Background location updated silently');
        } else {
          console.debug('Location unchanged - skipping background save');
        }
      } catch (error) {
        console.debug('Background location update failed (silent):', error);
        // Don't retry aggressively for background updates
      }
    }, intervalMinutes * 60 * 1000);

    console.debug(`Background location updates started (${intervalMinutes} min intervals)`);
  }

  // Stop background updates
  stopBackgroundUpdates() {
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval);
      this.backgroundUpdateInterval = null;
    }
  }

  // Register callback for location updates
  onLocationUpdate(callback) {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  // Register callback for location errors
  onLocationError(callback) {
    this.errorCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  // Notify all callbacks
  notifyCallbacks(type, data) {
    const callbacks = type === 'update' ? this.updateCallbacks : this.errorCallbacks;
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Location callback error:', error);
      }
    });
  }

  // Get cached location
  getCachedLocation() {
    return this.currentLocation;
  }

  // Check if location is stale
  isLocationStale(maxAgeMinutes = 30) {
    if (!this.lastUpdate) return true;
    const ageMinutes = (new Date() - this.lastUpdate) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  // Get location permission status
  async getPermissionStatus() {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      return 'unknown';
    }
  }

  // Initialize with all edge case handling - optimized for minimal UI impact
  async initialize(options = {}) {
    const {
      autoStart = true,
      backgroundUpdates = false, // Changed default to false
      watchLocation = false,
      onUpdate = null,
      onError = null
    } = options;

    // Register callbacks
    if (onUpdate) this.onLocationUpdate(onUpdate);
    if (onError) this.onLocationError(onError);

    // Check permission status
    const permission = await this.getPermissionStatus();
    
    if (permission === 'denied') {
      throw new Error('Location permission denied');
    }

    // Auto-start location if enabled - always silent for initialization
    if (autoStart && permission === 'granted') {
      try {
        await this.getCurrentLocation({ 
          silent: true,
          maximumAge: 1800000 // Use 30-minute cache for initialization
        });
        console.debug('Location initialized silently');
      } catch (error) {
        console.debug('Auto-start location failed (silent):', error);
      }
    }

    // Start background updates only if explicitly requested
    if (backgroundUpdates) {
      // Wait a bit before starting background updates to avoid initial rush
      setTimeout(() => {
        this.startBackgroundUpdates(30); // 30-minute intervals
      }, 10000); // Wait 10 seconds
    }

    // Start watching if enabled - always silent
    if (watchLocation) {
      setTimeout(() => {
        this.startWatching({ 
          autoSave: true, 
          silent: true,
          enableHighAccuracy: false // Less resource intensive
        });
      }, 5000); // Wait 5 seconds before watching
    }

    console.debug('Location manager initialized (silent mode)');
    return this;
  }

  // Clean up all resources
  destroy() {
    this.stopWatching();
    this.stopBackgroundUpdates();
    this.updateCallbacks.clear();
    this.errorCallbacks.clear();
    this.currentLocation = null;
    this.lastUpdate = null;
  }
}

// Create singleton instance
export const locationManager = new LocationManager();

// Export convenience functions
export const getCurrentLocation = (options) => locationManager.getCurrentLocation(options);
export const startLocationWatching = (options) => locationManager.startWatching(options);
export const stopLocationWatching = () => locationManager.stopWatching();
export const saveLocationToServer = (location, options) => locationManager.saveLocationToServer(location, options);