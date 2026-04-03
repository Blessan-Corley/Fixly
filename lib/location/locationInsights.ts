import { logger } from '../logger';
import { redisUtils } from '../redis';

import { getCurrentUserLocation } from './currentLocation';
import { calculateDistance } from './geo';
import { getHomeAddress } from './homeAddress';
import { getLocationHistory, getRecentLocations } from './locationHistory';
import type { LocationInsights } from './locationTracking.types';
import { LOCATION_CONFIG } from './locationTracking.utils';


export const findNearbyUsers = async (
  latInput: number,
  lngInput: number,
  radiusKm = 10,
  userType = 'all'
): Promise<Array<Record<string, unknown>>> => {
  try {
    if (!Number.isFinite(latInput) || !Number.isFinite(lngInput)) {
      return [];
    }

    const allUsers: Array<Record<string, unknown>> = [];
    const nearbyUsers: Array<Record<string, unknown>> = [];

    for (const user of allUsers) {
      const userId = typeof user.id === 'string' ? user.id : '';
      if (!userId) continue;

      const userLocation = await getCurrentUserLocation(userId);
      if (!userLocation) continue;

      const distance = calculateDistance(latInput, lngInput, userLocation.lat, userLocation.lng);
      if (distance <= radiusKm) {
        nearbyUsers.push({ ...user, location: userLocation, distance, userType });
      }
    }

    nearbyUsers.sort((a, b) => Number(a.distance ?? 0) - Number(b.distance ?? 0));
    return nearbyUsers;
  } catch (error: unknown) {
    logger.error({ error }, 'Error finding nearby users');
    return [];
  }
};

export const getLocationInsights = async (userId: string): Promise<LocationInsights> => {
  const emptyInsights: LocationInsights = {
    totalLocations: 0,
    recentActivityCount: 0,
    hasHomeAddress: false,
    mostFrequentArea: null,
    averageMovementDistance: 0,
    lastUpdated: null,
  };

  try {
    const [history, recentLocations, homeAddress] = await Promise.all([
      getLocationHistory(userId, 50),
      getRecentLocations(userId),
      getHomeAddress(userId),
    ]);

    const insights: LocationInsights = {
      totalLocations: history.length,
      recentActivityCount: recentLocations.length,
      hasHomeAddress: Boolean(homeAddress),
      mostFrequentArea: null,
      averageMovementDistance: 0,
      lastUpdated: history[0]?.timestamp ?? null,
    };

    if (history.length > 1) {
      let totalDistance = 0;
      for (let i = 1; i < history.length; i += 1) {
        totalDistance += calculateDistance(
          history[i - 1].lat,
          history[i - 1].lng,
          history[i].lat,
          history[i].lng
        );
      }
      insights.averageMovementDistance = totalDistance / (history.length - 1);
    }

    if (recentLocations.length > 0) {
      const areaGroups: Record<string, number> = {};
      recentLocations.forEach((location) => {
        const areaKey = `${Math.floor(location.lat * 100)}_${Math.floor(location.lng * 100)}`;
        areaGroups[areaKey] = (areaGroups[areaKey] ?? 0) + 1;
      });

      const entries = Object.entries(areaGroups);
      if (entries.length > 0) {
        const mostFrequent = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
        insights.mostFrequentArea = { area: mostFrequent[0], visits: mostFrequent[1] };
      }
    }

    return insights;
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error getting location insights');
    return emptyInsights;
  }
};

export const cleanupOldLocationData = async (
  userId: string,
  daysToKeep = 30
): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const history = await getLocationHistory(userId, LOCATION_CONFIG.MAX_LOCATION_HISTORY);
    const filteredHistory = history.filter(
      (location) => new Date(location.timestamp) > cutoffDate
    );

    if (filteredHistory.length !== history.length) {
      const historyKey = `user_location:history:${userId}`;
      await redisUtils.setex(
        historyKey,
        LOCATION_CONFIG.CACHE_TTL.LOCATION_HISTORY,
        filteredHistory
      );

      logger.info(
        { userId, cleaned: history.length - filteredHistory.length },
        '[LocationTracking] Cleaned old location data'
      );
    }

    return filteredHistory.length;
  } catch (error: unknown) {
    logger.error({ error, userId }, 'Error cleaning up old location data');
    return 0;
  }
};

export const getLocationConfig = (): typeof LOCATION_CONFIG => LOCATION_CONFIG;
