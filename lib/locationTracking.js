// lib/locationTracking.js - Location tracking and caching for users
import { redisUtils } from './redis';
import { isWithinIndiaBounds, calculateDistance } from '../components/LocationPicker/locationUtils';

// Location tracking configuration
const LOCATION_CONFIG = {
  TRACKING_INTERVAL: 30 * 60 * 1000, // 30 minutes
  MIN_DISTANCE_THRESHOLD: 500, // 500 meters minimum movement
  MAX_LOCATION_HISTORY: 50, // Keep last 50 locations
  CACHE_TTL: {
    CURRENT_LOCATION: 30 * 60, // 30 minutes
    LOCATION_HISTORY: 24 * 60 * 60, // 24 hours
    HOME_ADDRESS: 7 * 24 * 60 * 60, // 7 days
    RECENT_LOCATIONS: 2 * 60 * 60 // 2 hours
  }
};

// Location data structure
const createLocationEntry = (lat, lng, address = null, locationType = 'gps') => ({
  lat: parseFloat(lat),
  lng: parseFloat(lng),
  address,
  locationType, // 'gps', 'manual', 'home'
  timestamp: new Date().toISOString(),
  accuracy: null
});

// Get user's current location from cache
export const getCurrentUserLocation = async (userId) => {
  try {
    const cacheKey = `user_location:current:${userId}`;
    const cachedLocation = await redisUtils.get(cacheKey);

    if (cachedLocation) {
      return JSON.parse(cachedLocation);
    }

    return null;
  } catch (error) {
    console.error('Error getting current user location:', error);
    return null;
  }
};

// Update user's current location
export const updateCurrentLocation = async (userId, lat, lng, address = null, locationType = 'gps') => {
  try {
    // Validate coordinates are within India
    if (!isWithinIndiaBounds(lat, lng)) {
      throw new Error('Location is outside India bounds');
    }

    const locationEntry = createLocationEntry(lat, lng, address, locationType);

    // Check if this is a significant location change
    const currentLocation = await getCurrentUserLocation(userId);
    let shouldUpdate = true;

    if (currentLocation) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        lat,
        lng
      );

      // Only update if moved more than threshold distance or if it's been more than tracking interval
      const timeDiff = new Date() - new Date(currentLocation.timestamp);
      shouldUpdate = distance > (LOCATION_CONFIG.MIN_DISTANCE_THRESHOLD / 1000) ||
                    timeDiff > LOCATION_CONFIG.TRACKING_INTERVAL;
    }

    if (shouldUpdate) {
      // Update current location
      const currentLocationKey = `user_location:current:${userId}`;
      await redisUtils.setex(
        currentLocationKey,
        LOCATION_CONFIG.CACHE_TTL.CURRENT_LOCATION,
        JSON.stringify(locationEntry)
      );

      // Add to location history
      await addToLocationHistory(userId, locationEntry);

      // Update recent locations for nearby searches
      await updateRecentLocations(userId, locationEntry);

      console.log(`✅ Location updated for user ${userId}: ${lat}, ${lng}`);
      return locationEntry;
    }

    return currentLocation;
  } catch (error) {
    console.error('Error updating current location:', error);
    throw error;
  }
};

// Add location to user's history
const addToLocationHistory = async (userId, locationEntry) => {
  try {
    const historyKey = `user_location:history:${userId}`;

    // Get existing history
    const existingHistory = await redisUtils.get(historyKey);
    let history = existingHistory ? JSON.parse(existingHistory) : [];

    // Add new location to the beginning
    history.unshift(locationEntry);

    // Keep only the most recent locations
    if (history.length > LOCATION_CONFIG.MAX_LOCATION_HISTORY) {
      history = history.slice(0, LOCATION_CONFIG.MAX_LOCATION_HISTORY);
    }

    // Save updated history
    await redisUtils.setex(
      historyKey,
      LOCATION_CONFIG.CACHE_TTL.LOCATION_HISTORY,
      JSON.stringify(history)
    );

    return history;
  } catch (error) {
    console.error('Error adding to location history:', error);
    throw error;
  }
};

// Update recent locations for nearby service discovery
const updateRecentLocations = async (userId, locationEntry) => {
  try {
    const recentKey = `user_location:recent:${userId}`;

    // Get existing recent locations
    const existingRecent = await redisUtils.get(recentKey);
    let recentLocations = existingRecent ? JSON.parse(existingRecent) : [];

    // Check if this location is already in recent (within 1km)
    const existingIndex = recentLocations.findIndex(location =>
      calculateDistance(location.lat, location.lng, locationEntry.lat, locationEntry.lng) < 1
    );

    if (existingIndex !== -1) {
      // Update existing location timestamp
      recentLocations[existingIndex] = locationEntry;
    } else {
      // Add new location
      recentLocations.unshift(locationEntry);

      // Keep only last 10 recent locations
      if (recentLocations.length > 10) {
        recentLocations = recentLocations.slice(0, 10);
      }
    }

    // Save updated recent locations
    await redisUtils.setex(
      recentKey,
      LOCATION_CONFIG.CACHE_TTL.RECENT_LOCATIONS,
      JSON.stringify(recentLocations)
    );

    return recentLocations;
  } catch (error) {
    console.error('Error updating recent locations:', error);
    throw error;
  }
};

// Set user's home address
export const setHomeAddress = async (userId, addressData) => {
  try {
    const homeAddressKey = `user_location:home:${userId}`;

    const homeAddress = {
      ...addressData,
      setAt: new Date().toISOString(),
      locationType: 'home'
    };

    await redisUtils.setex(
      homeAddressKey,
      LOCATION_CONFIG.CACHE_TTL.HOME_ADDRESS,
      JSON.stringify(homeAddress)
    );

    // Also update current location if coordinates are available
    if (addressData.coordinates) {
      await updateCurrentLocation(
        userId,
        addressData.coordinates.lat,
        addressData.coordinates.lng,
        addressData.formattedAddress,
        'home'
      );
    }

    console.log(`✅ Home address set for user ${userId}`);
    return homeAddress;
  } catch (error) {
    console.error('Error setting home address:', error);
    throw error;
  }
};

// Get user's home address
export const getHomeAddress = async (userId) => {
  try {
    const homeAddressKey = `user_location:home:${userId}`;
    const homeAddress = await redisUtils.get(homeAddressKey);

    if (homeAddress) {
      return JSON.parse(homeAddress);
    }

    return null;
  } catch (error) {
    console.error('Error getting home address:', error);
    return null;
  }
};

// Get user's location history
export const getLocationHistory = async (userId, limit = 20) => {
  try {
    const historyKey = `user_location:history:${userId}`;
    const history = await redisUtils.get(historyKey);

    if (history) {
      const locationHistory = JSON.parse(history);
      return locationHistory.slice(0, limit);
    }

    return [];
  } catch (error) {
    console.error('Error getting location history:', error);
    return [];
  }
};

// Get recent locations for nearby service discovery
export const getRecentLocations = async (userId) => {
  try {
    const recentKey = `user_location:recent:${userId}`;
    const recent = await redisUtils.get(recentKey);

    if (recent) {
      return JSON.parse(recent);
    }

    return [];
  } catch (error) {
    console.error('Error getting recent locations:', error);
    return [];
  }
};

// Find nearby users/services (for fixers to find nearby jobs)
export const findNearbyUsers = async (lat, lng, radiusKm = 10, userType = 'all') => {
  try {
    // This would typically use Redis geospatial commands or a geospatial index
    // For now, we'll implement a basic version that checks recent locations

    const allUsers = []; // In a real implementation, this would query active users
    const nearbyUsers = [];

    for (const user of allUsers) {
      const userLocation = await getCurrentUserLocation(user.id);
      if (userLocation) {
        const distance = calculateDistance(lat, lng, userLocation.lat, userLocation.lng);
        if (distance <= radiusKm) {
          nearbyUsers.push({
            ...user,
            location: userLocation,
            distance: distance
          });
        }
      }
    }

    // Sort by distance
    nearbyUsers.sort((a, b) => a.distance - b.distance);

    return nearbyUsers;
  } catch (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }
};

// Get location insights for analytics
export const getLocationInsights = async (userId) => {
  try {
    const history = await getLocationHistory(userId, 50);
    const recentLocations = await getRecentLocations(userId);
    const homeAddress = await getHomeAddress(userId);

    // Calculate insights
    const insights = {
      totalLocations: history.length,
      recentActivityCount: recentLocations.length,
      hasHomeAddress: !!homeAddress,
      mostFrequentArea: null,
      averageMovementDistance: 0,
      lastUpdated: history[0]?.timestamp || null
    };

    if (history.length > 1) {
      // Calculate average movement distance
      let totalDistance = 0;
      for (let i = 1; i < history.length; i++) {
        const distance = calculateDistance(
          history[i-1].lat,
          history[i-1].lng,
          history[i].lat,
          history[i].lng
        );
        totalDistance += distance;
      }
      insights.averageMovementDistance = totalDistance / (history.length - 1);
    }

    // Find most frequent area (simplified - group by approximate coordinates)
    if (recentLocations.length > 0) {
      const areaGroups = {};
      recentLocations.forEach(location => {
        const areaKey = `${Math.floor(location.lat * 100)}_${Math.floor(location.lng * 100)}`;
        areaGroups[areaKey] = (areaGroups[areaKey] || 0) + 1;
      });

      const mostFrequent = Object.entries(areaGroups).reduce((a, b) =>
        areaGroups[a[0]] > areaGroups[b[0]] ? a : b
      );

      if (mostFrequent) {
        insights.mostFrequentArea = {
          area: mostFrequent[0],
          visits: mostFrequent[1]
        };
      }
    }

    return insights;
  } catch (error) {
    console.error('Error getting location insights:', error);
    return {
      totalLocations: 0,
      recentActivityCount: 0,
      hasHomeAddress: false,
      mostFrequentArea: null,
      averageMovementDistance: 0,
      lastUpdated: null
    };
  }
};

// Clean up old location data
export const cleanupOldLocationData = async (userId, daysToKeep = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const history = await getLocationHistory(userId, LOCATION_CONFIG.MAX_LOCATION_HISTORY);
    const filteredHistory = history.filter(location =>
      new Date(location.timestamp) > cutoffDate
    );

    if (filteredHistory.length !== history.length) {
      const historyKey = `user_location:history:${userId}`;
      await redisUtils.setex(
        historyKey,
        LOCATION_CONFIG.CACHE_TTL.LOCATION_HISTORY,
        JSON.stringify(filteredHistory)
      );

      console.log(`✅ Cleaned up ${history.length - filteredHistory.length} old locations for user ${userId}`);
    }

    return filteredHistory.length;
  } catch (error) {
    console.error('Error cleaning up old location data:', error);
    return 0;
  }
};

// Export location tracking configuration
export const getLocationConfig = () => LOCATION_CONFIG;

export default {
  getCurrentUserLocation,
  updateCurrentLocation,
  setHomeAddress,
  getHomeAddress,
  getLocationHistory,
  getRecentLocations,
  findNearbyUsers,
  getLocationInsights,
  cleanupOldLocationData,
  getLocationConfig
};