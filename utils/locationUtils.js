/**
 * Location utilities for distance calculation and geolocation
 */

// Haversine formula to calculate distance between two points
export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Format distance for display
export function formatDistance(distanceKm) {
  if (!distanceKm) return '';
  
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  } else {
    return `${Math.round(distanceKm)}km`;
  }
}

// Get user's current location
export function getUserLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes cache
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let message = 'Unable to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      defaultOptions
    );
  });
}

// Sort jobs by distance from user location
export function sortJobsByDistance(jobs, userLat, userLng) {
  if (!userLat || !userLng || !jobs.length) return jobs;
  
  return jobs
    .map(job => ({
      ...job,
      distance: calculateDistance(userLat, userLng, job.location?.lat, job.location?.lng)
    }))
    .sort((a, b) => {
      // Jobs without location go to the end
      if (!a.distance && !b.distance) return 0;
      if (!a.distance) return 1;
      if (!b.distance) return -1;
      return a.distance - b.distance;
    });
}

// Filter jobs within a certain radius
export function filterJobsByRadius(jobs, userLat, userLng, radiusKm) {
  if (!userLat || !userLng || !jobs.length) return jobs;
  
  return jobs.filter(job => {
    const distance = calculateDistance(userLat, userLng, job.location?.lat, job.location?.lng);
    return distance && distance <= radiusKm;
  });
}

// Get city coordinates from cities data
export function getCityCoordinates(cityName, citiesData) {
  const city = citiesData.find(c => 
    c.name.toLowerCase() === cityName.toLowerCase()
  );
  return city ? { lat: city.lat, lng: city.lng } : null;
}

// Location permission status
export async function checkLocationPermission() {
  if (!navigator.permissions) {
    return 'unsupported';
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    return 'unsupported';
  }
}

// Storage keys for user location preferences
export const LOCATION_STORAGE_KEYS = {
  USER_LOCATION: 'fixly_user_location',
  LOCATION_PERMISSION: 'fixly_location_permission',
  PREFERRED_RADIUS: 'fixly_preferred_radius',
  LOCATION_ENABLED: 'fixly_location_enabled'
};

// Save/load user location preferences
export function saveUserLocation(location) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEYS.USER_LOCATION, JSON.stringify({
      ...location,
      timestamp: Date.now(),
      expiresIn: 6 * 60 * 60 * 1000, // 6 hours - people move locations  
      source: 'gps'
    }));
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_ENABLED, 'true');
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_PERMISSION, 'granted');
    return true;
  } catch (error) {
    console.error('Failed to save user location:', error);
    return false;
  }
}

export function loadUserLocation() {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEYS.USER_LOCATION);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    const sixHours = 6 * 60 * 60 * 1000; // 6 hours - people move locations
    
    // Return cached location if less than 6 hours old
    if (Date.now() - data.timestamp < sixHours) {
      return { lat: data.lat, lng: data.lng, city: data.city, state: data.state };
    }
    
    // Clear expired data
    clearUserLocation();
    return null;
  } catch (error) {
    console.error('Failed to load user location:', error);
    return null;
  }
}

export function clearUserLocation() {
  try {
    localStorage.removeItem(LOCATION_STORAGE_KEYS.USER_LOCATION);
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_ENABLED, 'false');
  } catch (error) {
    console.error('Failed to clear user location:', error);
  }
}

// Save location rejection state
export function saveLocationRejection() {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_PERMISSION, 'denied');
    localStorage.setItem(LOCATION_STORAGE_KEYS.LOCATION_ENABLED, 'false');
    return true;
  } catch (error) {
    console.error('Failed to save location rejection:', error);
    return false;
  }
}

// Check if user previously rejected location
export function isLocationRejected() {
  try {
    return localStorage.getItem(LOCATION_STORAGE_KEYS.LOCATION_PERMISSION) === 'denied';
  } catch (error) {
    return false;
  }
}

// Distance-based job categories
export const DISTANCE_RANGES = [
  { label: 'Within 2km', value: 2, priority: 'high' },
  { label: 'Within 5km', value: 5, priority: 'medium' },
  { label: 'Within 10km', value: 10, priority: 'low' },
  { label: 'Within 25km', value: 25, priority: 'very-low' },
  { label: 'Any distance', value: null, priority: 'none' }
];

// Get distance priority for job ranking
export function getDistancePriority(distanceKm) {
  if (!distanceKm) return 0;
  
  if (distanceKm <= 2) return 4;
  if (distanceKm <= 5) return 3;
  if (distanceKm <= 10) return 2;
  if (distanceKm <= 25) return 1;
  return 0;
}