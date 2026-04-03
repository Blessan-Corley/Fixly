import { logger } from '../logger';
import { redisUtils } from '../redis';

import { calculateDistance } from './geo';
import type { LocationEntry } from './locationTracking.types';
import { LOCATION_CONFIG, parseJson } from './locationTracking.utils';

export const addToLocationHistory = async (
  userId: string,
  locationEntry: LocationEntry
): Promise<LocationEntry[]> => {
  try {
    const historyKey = `user_location:history:${userId}`;
    const existingHistory = await redisUtils.get(historyKey);
    const history = parseJson<LocationEntry[]>(existingHistory, []);

    const updated = [locationEntry, ...history].slice(0, LOCATION_CONFIG.MAX_LOCATION_HISTORY);

    await redisUtils.setex(historyKey, LOCATION_CONFIG.CACHE_TTL.LOCATION_HISTORY, updated);

    return updated;
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error adding to location history');
    throw error;
  }
};

export const updateRecentLocations = async (
  userId: string,
  locationEntry: LocationEntry
): Promise<LocationEntry[]> => {
  try {
    const recentKey = `user_location:recent:${userId}`;
    const existingRecent = await redisUtils.get(recentKey);
    const recentLocations = parseJson<LocationEntry[]>(existingRecent, []);

    const existingIndex = recentLocations.findIndex(
      (location) =>
        calculateDistance(location.lat, location.lng, locationEntry.lat, locationEntry.lng) < 1
    );

    let updated: LocationEntry[];
    if (existingIndex !== -1) {
      updated = [...recentLocations];
      updated[existingIndex] = locationEntry;
    } else {
      updated = [locationEntry, ...recentLocations].slice(0, 10);
    }

    await redisUtils.setex(recentKey, LOCATION_CONFIG.CACHE_TTL.RECENT_LOCATIONS, updated);

    return updated;
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error updating recent locations');
    throw error;
  }
};

export const getLocationHistory = async (userId: string, limit = 20): Promise<LocationEntry[]> => {
  try {
    const historyKey = `user_location:history:${userId}`;
    const history = await redisUtils.get(historyKey);
    const locationHistory = parseJson<LocationEntry[]>(history, []);
    return locationHistory.slice(0, Math.max(1, limit));
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error getting location history');
    return [];
  }
};

export const getRecentLocations = async (userId: string): Promise<LocationEntry[]> => {
  try {
    const recentKey = `user_location:recent:${userId}`;
    const recent = await redisUtils.get(recentKey);
    return parseJson<LocationEntry[]>(recent, []);
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error getting recent locations');
    return [];
  }
};
