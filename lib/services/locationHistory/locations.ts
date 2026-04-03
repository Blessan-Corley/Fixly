import { logger } from '@/lib/logger';

import User from '../../../models/User';
import { CHANNELS, EVENTS } from '../../ably';
import dbConnect from '../../db';
import { redisUtils } from '../../redis';

import {
  LOCATION_CACHE_TTL_SECONDS,
  LOCATION_HISTORY_RETENTION_MS,
  userLocationCacheKey,
} from './constants';
import {
  maybeRequestLocationRefresh,
  updateTrackingState,
} from './tracking';
import type {
  AblyClientLike,
  LocationCachePayload,
  LocationEntry,
  LocationHistoryResult,
  LocationInput,
  UserDocLike,
  UserLeanLocation,
} from './types';
import { normalizeLocationInput, parseJSON } from './utils';

export async function updateUserLocation(
  userId: string,
  location: LocationInput,
  ably: AblyClientLike | null,
  updateSuggestions: (userId: string, options: { notifyUser?: boolean; forceRefresh?: boolean }) => Promise<void>
): Promise<LocationEntry> {
  await dbConnect();

  const user = (await User.findById(userId)) as UserDocLike | null;
  if (!user) {
    throw new Error('User not found');
  }

  const locationEntry = normalizeLocationInput(location);
  if (!locationEntry) {
    throw new Error('Invalid location coordinates');
  }

  user.location = locationEntry;

  if (!Array.isArray(user.locationHistory)) {
    user.locationHistory = [];
  }

  user.locationHistory.unshift(locationEntry);

  if (user.locationHistory.length > 50) {
    user.locationHistory = user.locationHistory.slice(0, 50);
  }

  user.lastLocationUpdate = locationEntry.timestamp;
  await user.save();

  const locationCache: LocationCachePayload = {
    current: locationEntry,
    history: user.locationHistory.slice(0, 10),
    lastUpdate: locationEntry.timestamp.toISOString(),
  };

  await redisUtils.set(userLocationCacheKey(userId), locationCache, LOCATION_CACHE_TTL_SECONDS);

  if (ably) {
    try {
      const channel = ably.channels.get(CHANNELS.userPresence(userId));
      await channel.publish(EVENTS.LOCATION_UPDATED, {
        userId,
        location: locationEntry,
        timestamp: locationEntry.timestamp.toISOString(),
      });
    } catch (ablyError: unknown) {
      logger.error('Failed to broadcast location update:', ablyError);
    }
  }

  const trackingState = await updateTrackingState(userId, (previous) => {
    if (!previous?.active) {
      return previous;
    }

    return {
      ...previous,
      lastUpdate: locationEntry.timestamp.toISOString(),
    };
  });

  if (trackingState?.active) {
    await updateSuggestions(userId, {
      notifyUser: true,
      forceRefresh: true,
    });
  }

  logger.info(`[LocationHistory] Location updated for user ${userId}`);
  return locationEntry;
}

export async function getLocationHistory(
  userId: string,
  ably: AblyClientLike | null,
  limit = 20
): Promise<LocationHistoryResult> {
  try {
    await maybeRequestLocationRefresh(userId, ably);

    const cached = await redisUtils.get<LocationCachePayload>(userLocationCacheKey(userId));
    const locationData = parseJSON<LocationCachePayload>(cached);

    if (locationData) {
      return {
        current: locationData.current,
        history: Array.isArray(locationData.history) ? locationData.history.slice(0, limit) : [],
        source: 'cache',
      };
    }

    await dbConnect();
    const user = (await User.findById(userId)
      .select('location locationHistory')
      .lean()) as UserLeanLocation | null;

    if (!user) {
      return { current: null, history: [], source: 'database' };
    }

    return {
      current: user.location ?? null,
      history: Array.isArray(user.locationHistory) ? user.locationHistory.slice(0, limit) : [],
      source: 'database',
    };
  } catch (error: unknown) {
    logger.error('Error getting location history:', error);
    return { current: null, history: [], source: 'error' };
  }
}

export async function cleanupOldLocations(): Promise<void> {
  try {
    await dbConnect();

    const cutoffDate = new Date(Date.now() - LOCATION_HISTORY_RETENTION_MS);
    const result = (await User.updateMany(
      {},
      {
        $pull: {
          locationHistory: {
            timestamp: { $lt: cutoffDate },
          },
        },
      }
    )) as { modifiedCount?: number };

    logger.info(
      `[LocationHistory] Cleaned old location history for ${Number(result.modifiedCount ?? 0)} users`
    );
  } catch (error: unknown) {
    logger.error('Error cleaning up old locations:', error);
  }
}

