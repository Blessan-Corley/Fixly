// Phase 2: Switched location history realtime publishing onto the unified Ably event catalogue.
import { logger } from '@/lib/logger';

import { getServerAbly } from '../../ably';
import dbConnect from '../../db';
import { redisUtils } from '../../redis';

import { locationTrackingKey, TRACKING_STALE_AFTER_MS } from './constants';
import { cleanupOldLocations, getLocationHistory, updateUserLocation } from './locations';
import { getJobSuggestions, updateRelevantSuggestions } from './suggestions';
import { requestLocationUpdate, updateTrackingState } from './tracking';
import type {
  AblyClientLike,
  JobSuggestionsResult,
  LocationEntry,
  LocationHistoryResult,
  LocationInput,
} from './types';

export type { LocationInput, LocationEntry, LocationHistoryResult, JobSuggestionsResult };

export class LocationHistoryService {
  private ably: AblyClientLike | null;

  constructor() {
    this.ably = null;
  }

  async init(): Promise<LocationHistoryService> {
    this.ably = getServerAbly() as AblyClientLike | null;
    return this;
  }

  async startLocationTracking(
    userId: string,
    initialLocation: LocationInput | null = null
  ): Promise<void> {
    try {
      await dbConnect();

      if (initialLocation) {
        await this.updateUserLocation(userId, initialLocation);
      }

      await updateTrackingState(userId, (previous) => ({
        active: true,
        intervalMs: TRACKING_STALE_AFTER_MS,
        lastUpdate: previous?.lastUpdate,
        lastLocationRequestAt: previous?.lastLocationRequestAt,
        lastSuggestionsRefreshAt: previous?.lastSuggestionsRefreshAt,
        lastNotificationAt: previous?.lastNotificationAt,
      }));

      await requestLocationUpdate(userId, this.ably, 'tracking_started');
      await this.updateRelevantSuggestions(userId, { notifyUser: false, forceRefresh: true });
    } catch (error: unknown) {
      logger.error('Error starting location tracking:', error);
    }
  }

  async stopLocationTracking(userId: string): Promise<void> {
    try {
      await redisUtils.del(locationTrackingKey(userId));
      logger.info(`[LocationHistory] Tracking disabled for user ${userId}`);
    } catch (error: unknown) {
      logger.error('Error stopping location tracking:', error);
    }
  }

  async updateUserLocation(userId: string, location: LocationInput): Promise<LocationEntry> {
    return updateUserLocation(userId, location, this.ably, (uid, opts) =>
      this.updateRelevantSuggestions(uid, opts)
    );
  }

  async requestLocationUpdate(userId: string, reason = 'manual_update'): Promise<void> {
    return requestLocationUpdate(userId, this.ably, reason);
  }

  async updateRelevantSuggestions(
    userId: string,
    options: { notifyUser?: boolean; forceRefresh?: boolean } = {}
  ): Promise<void> {
    return updateRelevantSuggestions(userId, this.ably, options);
  }

  async getLocationHistory(userId: string, limit = 20): Promise<LocationHistoryResult> {
    return getLocationHistory(userId, this.ably, limit);
  }

  async getJobSuggestions(userId: string): Promise<JobSuggestionsResult> {
    return getJobSuggestions(userId, this.ably, (uid, opts) =>
      this.updateRelevantSuggestions(uid, opts)
    );
  }

  async cleanupOldLocations(): Promise<void> {
    return cleanupOldLocations();
  }

  async initializeActiveTracking(): Promise<void> {
    return Promise.resolve();
  }

  async cleanup(): Promise<void> {
    return Promise.resolve();
  }
}
