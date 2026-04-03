import { logger } from '../logger';
import { redisUtils } from '../redis';

import { calculateDistance, isWithinIndiaBounds } from './geo';
import { addToLocationHistory, updateRecentLocations } from './locationHistory';
import type { LocationEntry, LocationType } from './locationTracking.types';
import {
  LOCATION_CONFIG,
  createLocationEntry,
  parseJson,
  parseNumber,
} from './locationTracking.utils';

export const getCurrentUserLocation = async (userId: string): Promise<LocationEntry | null> => {
  try {
    const cacheKey = `user_location:current:${userId}`;
    const cachedLocation = await redisUtils.get(cacheKey);
    return parseJson<LocationEntry | null>(cachedLocation, null);
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error getting current user location');
    return null;
  }
};

export const updateCurrentLocation = async (
  userId: string,
  latInput: number,
  lngInput: number,
  address: string | null = null,
  locationType: LocationType = 'gps'
): Promise<LocationEntry | null> => {
  try {
    const lat = parseNumber(latInput);
    const lng = parseNumber(lngInput);

    if (lat === null || lng === null) {
      throw new Error('Invalid coordinates');
    }

    if (!isWithinIndiaBounds(lat, lng)) {
      throw new Error('Location is outside India bounds');
    }

    const locationEntry = createLocationEntry(lat, lng, address, locationType);
    const currentLocation = await getCurrentUserLocation(userId);
    let shouldUpdate = true;

    if (currentLocation) {
      const distance = calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng);
      const timeDiff = Date.now() - new Date(currentLocation.timestamp).getTime();

      shouldUpdate =
        distance > LOCATION_CONFIG.MIN_DISTANCE_THRESHOLD / 1000 ||
        timeDiff > LOCATION_CONFIG.TRACKING_INTERVAL;
    }

    if (!shouldUpdate) {
      return currentLocation;
    }

    const currentLocationKey = `user_location:current:${userId}`;
    await redisUtils.setex(
      currentLocationKey,
      LOCATION_CONFIG.CACHE_TTL.CURRENT_LOCATION,
      locationEntry
    );

    await Promise.all([
      addToLocationHistory(userId, locationEntry),
      updateRecentLocations(userId, locationEntry),
    ]);

    logger.info({ userId, lat, lng }, '[LocationTracking] Location updated');
    return locationEntry;
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error updating current location');
    throw error;
  }
};
