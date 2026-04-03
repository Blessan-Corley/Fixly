import { logger } from '@/lib/logger';

import Job from '../../../models/Job';
import User from '../../../models/User';
import { CHANNELS, EVENTS } from '../../ably';
import dbConnect from '../../db';
import { redisUtils } from '../../redis';
import { sendTemplatedNotification } from '../notifications';

import {
  JOB_SUGGESTION_RADIUS_KM,
  JOB_SUGGESTIONS_TTL_SECONDS,
  NOTIFICATION_COOLDOWN_MS,
  SUGGESTION_REFRESH_INTERVAL_MS,
  jobSuggestionsCacheKey,
} from './constants';
import { getTrackingState, maybeRequestLocationRefresh, updateTrackingState } from './tracking';
import type {
  AblyClientLike,
  JobSuggestionsPayload,
  JobSuggestionsResult,
  UserDocLike,
} from './types';
import { isStaleTimestamp, parseJSON, toSafeNumber } from './utils';

export async function updateRelevantSuggestions(
  userId: string,
  ably: AblyClientLike | null,
  options: { notifyUser?: boolean; forceRefresh?: boolean } = {}
): Promise<void> {
  try {
    const trackingState = await getTrackingState(userId);
    const shouldNotifyUser = options.notifyUser === true;
    const shouldRefresh =
      options.forceRefresh === true ||
      isStaleTimestamp(trackingState?.lastSuggestionsRefreshAt, SUGGESTION_REFRESH_INTERVAL_MS);

    if (!shouldRefresh) {
      return;
    }

    await dbConnect();

    const user = (await User.findById(userId)) as UserDocLike | null;
    if (!user || !user.location?.coordinates) {
      return;
    }

    const userLat = toSafeNumber(user.location.coordinates.latitude);
    const userLng = toSafeNumber(user.location.coordinates.longitude);

    if (userLat === null || userLng === null) {
      return;
    }

    const nearbyJobs = (await Job.find({
      status: 'open',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat],
          },
          $maxDistance: JOB_SUGGESTION_RADIUS_KM * 1000,
        },
      },
      createdBy: { $ne: userId },
      skillsRequired: {
        $in: user.skills || [],
      },
    })
      .limit(10)
      .populate('createdBy', 'name rating')
      .lean()) as unknown[];

    const generatedAt = new Date().toISOString();
    const suggestionsPayload: JobSuggestionsPayload = {
      jobs: nearbyJobs,
      location: user.location,
      generatedAt,
      radius: JOB_SUGGESTION_RADIUS_KM,
    };

    await redisUtils.set(
      jobSuggestionsCacheKey(userId),
      suggestionsPayload,
      JOB_SUGGESTIONS_TTL_SECONDS
    );

    const nextTrackingState = await updateTrackingState(userId, (previous) => {
      if (!previous?.active) {
        return previous;
      }

      return {
        ...previous,
        lastSuggestionsRefreshAt: generatedAt,
      };
    });

    const canNotify =
      shouldNotifyUser &&
      nearbyJobs.length > 0 &&
      user.preferences?.jobNotifications !== false &&
      isStaleTimestamp(nextTrackingState?.lastNotificationAt, NOTIFICATION_COOLDOWN_MS);

    if (canNotify) {
      await sendTemplatedNotification(
        'JOB_STATUS_UPDATE',
        userId,
        {
          jobTitle: `${nearbyJobs.length} relevant job${nearbyJobs.length > 1 ? 's' : ''}`,
          status: `nearby in ${user.location.city || 'your area'}`,
        },
        {
          priority: 'low',
          senderId: 'system',
        }
      );

      await updateTrackingState(userId, (previous) => {
        if (!previous?.active) {
          return previous;
        }

        return {
          ...previous,
          lastNotificationAt: generatedAt,
        };
      });
    }

    if (ably) {
      const channel = ably.channels.get(CHANNELS.userNotifications(userId));
      await channel.publish(EVENTS.JOB_SUGGESTIONS_UPDATED, {
        userId,
        jobCount: nearbyJobs.length,
        location: user.location.city,
        timestamp: generatedAt,
      });
    }

    logger.info(
      `[LocationHistory] Suggestions refreshed for user ${userId}: ${nearbyJobs.length} relevant jobs`
    );
  } catch (error: unknown) {
    logger.error('Error updating relevant suggestions:', error);
  }
}

export async function getJobSuggestions(
  userId: string,
  ably: AblyClientLike | null,
  updateSuggestions: (userId: string, options: { notifyUser?: boolean; forceRefresh?: boolean }) => Promise<void>
): Promise<JobSuggestionsResult> {
  try {
    await maybeRequestLocationRefresh(userId, ably);

    const cached = await redisUtils.get<JobSuggestionsPayload>(jobSuggestionsCacheKey(userId));
    const suggestions = parseJSON<JobSuggestionsPayload>(cached);

    if (suggestions) {
      return {
        ...suggestions,
        source: 'cache',
      };
    }

    await updateSuggestions(userId, { notifyUser: false, forceRefresh: true });

    const freshCached = await redisUtils.get<JobSuggestionsPayload>(
      jobSuggestionsCacheKey(userId)
    );
    const freshSuggestions = parseJSON<JobSuggestionsPayload>(freshCached);

    if (freshSuggestions) {
      return {
        ...freshSuggestions,
        source: 'fresh',
      };
    }

    return {
      jobs: [],
      location: null,
      generatedAt: new Date().toISOString(),
      source: 'empty',
    };
  } catch (error: unknown) {
    logger.error('Error getting job suggestions:', error);
    return {
      jobs: [],
      location: null,
      generatedAt: new Date().toISOString(),
      source: 'error',
    };
  }
}
