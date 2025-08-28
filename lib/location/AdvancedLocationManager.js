// Advanced Location Manager with Auto-refresh and Nearby Jobs
'use client';

class AdvancedLocationManager {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.isTracking = false;
    this.lastUpdateTime = null;
    this.accuracyThreshold = 100; // meters
    this.updateInterval = 30000; // 30 seconds
    this.maxAge = 300000; // 5 minutes
    this.timeout = 15000; // 15 seconds
    this.nearbyRadius = 10; // kilometers
    this.eventEmitter = null;
    this.backgroundSync = null;
    
    // Cache for nearby jobs and location data
    this.locationCache = new Map();
    this.nearbyJobsCache = new Map();
    this.geocodeCache = new Map();
    
    // Auto-refresh intervals
    this.nearbyJobsInterval = null;
    this.locationUpdateInterval = null;
    
    if (typeof window !== 'undefined') {
      this.initEventEmitter();
      this.setupBackgroundSync();
    }
  }

  initEventEmitter() {
    if (typeof EventTarget !== 'undefined') {
      this.eventEmitter = new EventTarget();
    } else {
      // Fallback for older browsers
      this.eventEmitter = document.createElement('div');
    }
  }

  setupBackgroundSync() {
    // Set up service worker communication for background updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'LOCATION_UPDATE') {
          this.handleBackgroundLocationUpdate(event.data.location);
        } else if (event.data.type === 'NEARBY_JOBS_UPDATE') {
          this.handleBackgroundJobsUpdate(event.data.jobs);
        }
      });
    }
  }

  // Check if geolocation is supported
  isGeolocationSupported() {
    return 'geolocation' in navigator;
  }

  // Get current position with enhanced options
  async getCurrentLocation(options = {}) {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: this.timeout,
      maximumAge: this.maxAge
    };

    const locationOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.processLocationData(position);
          this.currentLocation = location;
          this.lastUpdateTime = Date.now();
          
          this.emitEvent('locationUpdated', { location });
          this.cacheLocation(location);
          
          // Automatically fetch nearby jobs
          this.fetchNearbyJobs(location.latitude, location.longitude);
          
          resolve(location);
        },
        (error) => {
          this.handleLocationError(error);
          reject(this.createLocationError(error));
        },
        locationOptions
      );
    });
  }

  // Start continuous location tracking with auto-refresh
  startLocationTracking(options = {}) {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported');
    }

    if (this.isTracking) {
      this.stopLocationTracking();
    }

    const trackingOptions = {
      enableHighAccuracy: true,
      timeout: this.timeout,
      maximumAge: 5000, // 5 seconds for tracking
      ...options
    };

    this.isTracking = true;
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.processLocationData(position);
        
        // Only update if location has significantly changed
        if (this.hasLocationChanged(location)) {
          this.currentLocation = location;
          this.lastUpdateTime = Date.now();
          
          this.emitEvent('locationUpdated', { location });
          this.cacheLocation(location);
          
          // Auto-fetch nearby jobs when location changes
          this.fetchNearbyJobs(location.latitude, location.longitude);
        }
      },
      (error) => {
        this.handleLocationError(error);
        this.emitEvent('locationError', { error: this.createLocationError(error) });
      },
      trackingOptions
    );

    // Set up auto-refresh for nearby jobs
    this.startNearbyJobsAutoRefresh();
    
    this.emitEvent('trackingStarted');
    console.log('Location tracking started');
    
    return this.watchId;
  }

  // Stop location tracking
  stopLocationTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    this.stopNearbyJobsAutoRefresh();
    
    this.emitEvent('trackingStopped');
    console.log('Location tracking stopped');
  }

  // Start auto-refresh for nearby jobs
  startNearbyJobsAutoRefresh(interval = 60000) { // 1 minute default
    if (this.nearbyJobsInterval) {
      clearInterval(this.nearbyJobsInterval);
    }

    this.nearbyJobsInterval = setInterval(() => {
      if (this.currentLocation) {
        this.fetchNearbyJobs(
          this.currentLocation.latitude, 
          this.currentLocation.longitude,
          true // silent update
        );
      }
    }, interval);

    console.log('Nearby jobs auto-refresh started');
  }

  // Stop auto-refresh for nearby jobs
  stopNearbyJobsAutoRefresh() {
    if (this.nearbyJobsInterval) {
      clearInterval(this.nearbyJobsInterval);
      this.nearbyJobsInterval = null;
    }
  }

  // Fetch nearby jobs based on location
  async fetchNearbyJobs(latitude, longitude, silent = false) {
    try {
      const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${this.nearbyRadius}`;
      const cachedJobs = this.nearbyJobsCache.get(cacheKey);
      
      // Return cached jobs if recent (within 5 minutes)
      if (cachedJobs && Date.now() - cachedJobs.timestamp < 300000) {
        if (!silent) {
          this.emitEvent('nearbyJobsUpdated', { 
            jobs: cachedJobs.jobs, 
            location: { latitude, longitude },
            fromCache: true
          });
        }
        return cachedJobs.jobs;
      }

      if (!silent) {
        this.emitEvent('nearbyJobsLoading');
      }

      const response = await fetch('/api/jobs/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius: this.nearbyRadius,
          limit: 50
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch nearby jobs: ${response.status}`);
      }

      const data = await response.json();
      const jobs = data.jobs || [];

      // Cache the results
      this.nearbyJobsCache.set(cacheKey, {
        jobs,
        timestamp: Date.now()
      });

      // Limit cache size
      if (this.nearbyJobsCache.size > 50) {
        const firstKey = this.nearbyJobsCache.keys().next().value;
        this.nearbyJobsCache.delete(firstKey);
      }

      this.emitEvent('nearbyJobsUpdated', { 
        jobs, 
        location: { latitude, longitude },
        fromCache: false
      });

      // Store in background for offline access
      this.storeJobsForOfflineAccess(jobs);

      return jobs;

    } catch (error) {
      console.error('Error fetching nearby jobs:', error);
      this.emitEvent('nearbyJobsError', { error: error.message });
      
      // Return cached jobs as fallback
      const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${this.nearbyRadius}`;
      const cachedJobs = this.nearbyJobsCache.get(cacheKey);
      return cachedJobs ? cachedJobs.jobs : [];
    }
  }

  // Get jobs within specific radius with custom filters
  async getJobsInRadius(latitude, longitude, radius, filters = {}) {
    try {
      const response = await fetch('/api/jobs/radius-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius,
          ...filters
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to search jobs: ${response.status}`);
      }

      const data = await response.json();
      return data.jobs || [];

    } catch (error) {
      console.error('Error searching jobs by radius:', error);
      throw error;
    }
  }

  // Reverse geocoding - get address from coordinates
  async reverseGeocode(latitude, longitude) {
    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const cached = this.geocodeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
      return cached.address;
    }

    try {
      const response = await fetch('/api/location/reverse-geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude, longitude })
      });

      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const data = await response.json();
      const address = data.address;

      // Cache the result
      this.geocodeCache.set(cacheKey, {
        address,
        timestamp: Date.now()
      });

      return address;

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        street: '',
        city: 'Unknown Location',
        state: '',
        country: '',
        postalCode: '',
        formatted: 'Location unavailable'
      };
    }
  }

  // Forward geocoding - get coordinates from address
  async geocodeAddress(address) {
    try {
      const response = await fetch('/api/location/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      const data = await response.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy || 1000,
        address: data.address
      };

    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }

  // Sort jobs by distance from current location
  sortJobsByDistance(jobs, userLat, userLon) {
    return jobs.map(job => ({
      ...job,
      distance: this.calculateDistance(
        userLat,
        userLon,
        job.location.latitude,
        job.location.longitude
      )
    })).sort((a, b) => a.distance - b.distance);
  }

  // Get nearby jobs with distance information
  async getNearbyJobsWithDistance() {
    if (!this.currentLocation) {
      await this.getCurrentLocation();
    }

    const jobs = await this.fetchNearbyJobs(
      this.currentLocation.latitude,
      this.currentLocation.longitude
    );

    return this.sortJobsByDistance(
      jobs,
      this.currentLocation.latitude,
      this.currentLocation.longitude
    );
  }

  // Process raw position data
  processLocationData(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp || Date.now()
    };
  }

  // Check if location has significantly changed
  hasLocationChanged(newLocation) {
    if (!this.currentLocation) return true;

    const distance = this.calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    ) * 1000; // Convert to meters

    return distance > this.accuracyThreshold;
  }

  // Cache location data
  cacheLocation(location) {
    const key = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
    this.locationCache.set(key, {
      ...location,
      cachedAt: Date.now()
    });

    // Limit cache size
    if (this.locationCache.size > 100) {
      const firstKey = this.locationCache.keys().next().value;
      this.locationCache.delete(firstKey);
    }
  }

  // Store jobs for offline access
  async storeJobsForOfflineAccess(jobs) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'CACHE_NEARBY_JOBS',
        jobs: jobs,
        timestamp: Date.now()
      });
    }
  }

  // Handle location errors
  handleLocationError(error) {
    console.error('Location error:', error);
    
    let userMessage;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        userMessage = 'Location access was denied. Please enable location services.';
        break;
      case error.POSITION_UNAVAILABLE:
        userMessage = 'Location information is unavailable.';
        break;
      case error.TIMEOUT:
        userMessage = 'Location request timed out.';
        break;
      default:
        userMessage = 'An unknown location error occurred.';
        break;
    }

    this.emitEvent('locationError', { error: userMessage, code: error.code });
  }

  // Create standardized error object
  createLocationError(error) {
    return {
      code: error.code,
      message: error.message,
      timestamp: Date.now()
    };
  }

  // Handle background location update from service worker
  handleBackgroundLocationUpdate(location) {
    this.currentLocation = location;
    this.emitEvent('locationUpdated', { location, fromBackground: true });
  }

  // Handle background jobs update from service worker
  handleBackgroundJobsUpdate(jobs) {
    this.emitEvent('nearbyJobsUpdated', { jobs, fromBackground: true });
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

  // Get current location info
  getLocationInfo() {
    return {
      currentLocation: this.currentLocation,
      isTracking: this.isTracking,
      lastUpdateTime: this.lastUpdateTime,
      watchId: this.watchId,
      nearbyRadius: this.nearbyRadius,
      cacheSize: {
        locations: this.locationCache.size,
        jobs: this.nearbyJobsCache.size,
        geocodes: this.geocodeCache.size
      }
    };
  }

  // Update settings
  updateSettings(settings = {}) {
    if (settings.accuracyThreshold !== undefined) {
      this.accuracyThreshold = settings.accuracyThreshold;
    }
    if (settings.updateInterval !== undefined) {
      this.updateInterval = settings.updateInterval;
    }
    if (settings.nearbyRadius !== undefined) {
      this.nearbyRadius = settings.nearbyRadius;
      // Clear job cache when radius changes
      this.nearbyJobsCache.clear();
    }
    if (settings.timeout !== undefined) {
      this.timeout = settings.timeout;
    }

    this.emitEvent('settingsUpdated', settings);
  }

  // Cleanup
  destroy() {
    this.stopLocationTracking();
    this.stopNearbyJobsAutoRefresh();
    
    // Clear caches
    this.locationCache.clear();
    this.nearbyJobsCache.clear();
    this.geocodeCache.clear();
    
    // Remove event listeners
    this.eventEmitter = null;
    
    console.log('AdvancedLocationManager destroyed');
  }
}

// Singleton instance
let locationManager = null;

export const getLocationManager = () => {
  if (!locationManager) {
    locationManager = new AdvancedLocationManager();
  }
  return locationManager;
};

export default AdvancedLocationManager;