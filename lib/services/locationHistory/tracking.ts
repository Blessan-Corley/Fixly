import { logger } from '@/lib/logger';

import { CHANNELS, EVENTS } from '../../ably';
import { redisUtils } from '../../redis';

import {
  TRACKING_STALE_AFTER_MS,
  TRACKING_STATE_TTL_SECONDS,
  locationTrackingKey,
} from './constants';
import type { AblyClientLike, TrackingState } from './types';
import { isStaleTimestamp, parseJSON } from './utils';

export async function getTrackingState(userId: string): Promise<TrackingState | null> {
  const cached = await redisUtils.get<TrackingState>(locationTrackingKey(userId));
  return parseJSON<TrackingState>(cached);
}

export async function setTrackingState(userId: string, state: TrackingState): Promise<void> {
  await redisUtils.set(locationTrackingKey(userId), state, TRACKING_STATE_TTL_SECONDS);
}

export async function updateTrackingState(
  userId: string,
  updater: (previous: TrackingState | null) => TrackingState | null
): Promise<TrackingState | null> {
  const nextState = updater(await getTrackingState(userId));
  if (!nextState) {
    await redisUtils.del(locationTrackingKey(userId));
    return null;
  }

  await setTrackingState(userId, nextState);
  return nextState;
}

export async function requestLocationUpdate(
  userId: string,
  ably: AblyClientLike | null,
  reason = 'manual_update'
): Promise<void> {
  try {
    if (ably) {
      const channel = ably.channels.get(CHANNELS.userNotifications(userId));
      await channel.publish(EVENTS.LOCATION_UPDATE_REQUESTED, {
        userId,
        timestamp: new Date().toISOString(),
        reason,
      });
    }

    await updateTrackingState(userId, (previous) => {
      if (!previous?.active) {
        return previous;
      }

      return {
        ...previous,
        lastLocationRequestAt: new Date().toISOString(),
      };
    });
  } catch (error: unknown) {
    logger.error('Error requesting location update:', error);
  }
}

export async function maybeRequestLocationRefresh(
  userId: string,
  ably: AblyClientLike | null
): Promise<void> {
  const trackingState = await getTrackingState(userId);
  if (!trackingState?.active) {
    return;
  }

  if (!isStaleTimestamp(trackingState.lastUpdate, TRACKING_STALE_AFTER_MS)) {
    return;
  }

  if (!isStaleTimestamp(trackingState.lastLocationRequestAt, TRACKING_STALE_AFTER_MS)) {
    return;
  }

  await requestLocationUpdate(userId, ably, 'stale_tracking_refresh');
}
