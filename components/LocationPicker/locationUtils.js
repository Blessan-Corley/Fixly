// components/LocationPicker/locationUtils.js - Utility functions for location handling
import { toast } from 'sonner';

// India geographical bounds
export const INDIA_BOUNDS = {
  north: 37.6,
  south: 6.4,
  east: 97.25,
  west: 68.7
};

// Major Indian cities for quick selection
export const MAJOR_INDIAN_CITIES = [
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025, state: 'Delhi' },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana' },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  { name: 'Surat', lat: 21.1702, lng: 72.8311, state: 'Gujarat' },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
  { name: 'Kanpur', lat: 26.4499, lng: 80.3319, state: 'Uttar Pradesh' },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  { name: 'Indore', lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
  { name: 'Thane', lat: 19.2183, lng: 72.9781, state: 'Maharashtra' },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh' },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
  { name: 'Vadodara', lat: 22.3072, lng: 73.1812, state: 'Gujarat' },
  { name: 'Firozabad', lat: 27.1592, lng: 78.3957, state: 'Uttar Pradesh' },
  { name: 'Ludhiana', lat: 30.9010, lng: 75.8573, state: 'Punjab' }
];

// Check if coordinates are within India bounds
export const isWithinIndiaBounds = (lat, lng) => {
  return lat >= INDIA_BOUNDS.south &&
         lat <= INDIA_BOUNDS.north &&
         lng >= INDIA_BOUNDS.west &&
         lng <= INDIA_BOUNDS.east;
};

// Get current user location using Geolocation API
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Check if location is within India
        if (!isWithinIndiaBounds(latitude, longitude)) {
          reject(new Error('Location detected outside India'));
          return;
        }

        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        reject(new Error(errorMessage));
      },
      options
    );
  });
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Find nearest major city
export const findNearestCity = (lat, lng) => {
  let nearestCity = null;
  let minDistance = Infinity;

  MAJOR_INDIAN_CITIES.forEach(city => {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = { ...city, distance };
    }
  });

  return nearestCity;
};

// Format location display name
export const formatLocationName = (location) => {
  if (!location) return 'Unknown Location';

  const parts = [];

  if (location.name) parts.push(location.name);
  if (location.locality) parts.push(location.locality);
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);

  return parts.join(', ') || 'Selected Location';
};

// Validate location data
export const validateLocation = (location) => {
  if (!location) return { valid: false, error: 'Location is required' };

  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return { valid: false, error: 'Invalid coordinates' };
  }

  if (!isWithinIndiaBounds(location.lat, location.lng)) {
    return { valid: false, error: 'Location must be within India' };
  }

  return { valid: true };
};

// Cache management for location data
export const locationCache = {
  // Cache search results
  cacheSearchResults: async (query, results) => {
    try {
      const response = await fetch('/api/location/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'search_results',
          key: encodeURIComponent(query.toLowerCase()),
          data: results
        })
      });

      if (!response.ok) {
        console.warn('Failed to cache search results:', response.statusText);
      }
    } catch (error) {
      console.warn('Cache storage error:', error);
    }
  },

  // Get cached search results
  getCachedSearchResults: async (query) => {
    try {
      const response = await fetch(`/api/location/cache?type=search_results&key=${encodeURIComponent(query.toLowerCase())}`);

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
    } catch (error) {
      console.warn('Cache retrieval error:', error);
    }
    return null;
  },

  // Cache place details
  cachePlaceDetails: async (placeId, details) => {
    try {
      const response = await fetch('/api/location/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'place_details',
          key: placeId,
          data: details
        })
      });

      if (!response.ok) {
        console.warn('Failed to cache place details:', response.statusText);
      }
    } catch (error) {
      console.warn('Cache storage error:', error);
    }
  },

  // Get cached place details
  getCachedPlaceDetails: async (placeId) => {
    try {
      const response = await fetch(`/api/location/cache?type=place_details&key=${placeId}`);

      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
    } catch (error) {
      console.warn('Cache retrieval error:', error);
    }
    return null;
  }
};

// Error handlers
export const handleLocationError = (error, context = 'location operation') => {
  console.error(`Location error in ${context}:`, error);

  let userMessage = 'Something went wrong with location services';

  if (error.message.includes('permission') || error.message.includes('denied')) {
    userMessage = 'Location access was denied. You can still select location manually.';
  } else if (error.message.includes('unavailable') || error.message.includes('timeout')) {
    userMessage = 'Unable to detect your location. Please select manually.';
  } else if (error.message.includes('network') || error.message.includes('fetch')) {
    userMessage = 'Network error. Please check your connection and try again.';
  } else if (error.message.includes('Google') || error.message.includes('maps')) {
    userMessage = 'Maps service is temporarily unavailable. Please try again later.';
  } else if (error.message.includes('outside India')) {
    userMessage = 'Your location appears to be outside India. Please select an Indian location.';
  }

  toast.error(userMessage);
  return userMessage;
};

// Debounce function for search input
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Mobile detection
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Touch event helpers for mobile
export const getTouchCoordinates = (event) => {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
};

// Accessibility helpers
export const announceToScreenReader = (message) => {
  if (typeof window === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';

  document.body.appendChild(announcement);
  announcement.textContent = message;

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

export default {
  INDIA_BOUNDS,
  MAJOR_INDIAN_CITIES,
  isWithinIndiaBounds,
  getCurrentLocation,
  calculateDistance,
  findNearestCity,
  formatLocationName,
  validateLocation,
  locationCache,
  handleLocationError,
  debounce,
  isMobileDevice,
  getTouchCoordinates,
  announceToScreenReader
};