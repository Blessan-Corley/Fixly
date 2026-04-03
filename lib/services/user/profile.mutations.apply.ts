import type { IUser } from '@/types/User';

import type { UpdatePayload, UserDocument } from './profile.schema';
import {
  buildAddressSummary,
  extractCoordinates,
  isPlainObject,
  normalizeLocationSource,
  toNumber,
  toTrimmedString,
  TWENTY_FOUR_HOURS_MS,
} from './profile.schema';

type MutationError = {
  body: Record<string, unknown>;
  status: number;
};

export type AppliedUpdatesResult =
  | { locationActuallyUpdated: boolean; anyUpdateApplied: boolean; error?: never }
  | { locationActuallyUpdated?: never; anyUpdateApplied?: never; error: MutationError };

export function applyProfileUpdates(
  user: UserDocument,
  updates: UpdatePayload
): AppliedUpdatesResult {
  let locationActuallyUpdated = false;
  let anyUpdateApplied = false;

  if (updates.location) {
    const coords = extractCoordinates(updates.location);
    if (coords) {
      if (user.lastLocationUpdate) {
        const elapsed = Date.now() - user.lastLocationUpdate.getTime();
        if (elapsed < TWENTY_FOUR_HOURS_MS) {
          const timeRemaining = TWENTY_FOUR_HOURS_MS - elapsed;
          const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
          const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

          return {
            error: {
              body: {
                message: `You can only update your location once every 24 hours. Please try again in ${hoursRemaining}h ${minutesRemaining}m.`,
                rateLimited: true,
                retryAfter: timeRemaining,
                hoursRemaining,
                minutesRemaining,
              },
              status: 429,
            },
          };
        }
      }

      const city = toTrimmedString(updates.location.city ?? updates.location.name) ?? '';
      const state = toTrimmedString(updates.location.state) ?? '';
      const source = normalizeLocationSource(updates.location.source);
      const addressSummary = buildAddressSummary(updates.location);
      const accuracy = toNumber(updates.location.accuracy) ?? undefined;

      user.location = {
        ...user.location,
        coordinates: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
        city,
        state,
        accuracy,
        timestamp: new Date(),
        source,
        homeAddress: {
          doorNo:
            toTrimmedString(updates.location.doorNo) ??
            toTrimmedString(user.location?.homeAddress?.doorNo) ??
            '',
          street:
            toTrimmedString(updates.location.street ?? updates.location.route) ??
            toTrimmedString(user.location?.homeAddress?.street) ??
            '',
          district:
            toTrimmedString(updates.location.district ?? updates.location.locality) ??
            toTrimmedString(user.location?.homeAddress?.district) ??
            '',
          state,
          postalCode:
            toTrimmedString(updates.location.postalCode ?? updates.location.postal_code) ?? '',
          formattedAddress: addressSummary,
          coordinates: {
            latitude: coords.lat,
            longitude: coords.lng,
          },
          setAt: new Date(),
        },
      };

      if (!Array.isArray(user.locationHistory)) {
        user.locationHistory = [];
      }

      user.locationHistory.unshift({
        coordinates: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
        address: addressSummary,
        city,
        state,
        source,
        accuracy,
        timestamp: new Date(),
        deviceInfo: {
          type: 'web',
          userAgent: 'Location update from profile',
        },
      });

      if (user.locationHistory.length > 10) {
        user.locationHistory = user.locationHistory.slice(0, 10);
      }

      user.lastLocationUpdate = new Date();
      locationActuallyUpdated = true;
      anyUpdateApplied = true;
    }
  }

  if (updates.name !== undefined) {
    user.name = updates.name;
    anyUpdateApplied = true;
  }

  if (updates.bio !== undefined) {
    user.bio = updates.bio;
    anyUpdateApplied = true;
  }

  if (updates.skills !== undefined && user.role === 'fixer') {
    user.skills = updates.skills;
    anyUpdateApplied = true;
  }

  if (updates.preferences !== undefined) {
    user.preferences = {
      ...(isPlainObject(user.preferences) ? user.preferences : {}),
      ...updates.preferences,
    } as IUser['preferences'];
    anyUpdateApplied = true;
  }

  if (updates.profilePhoto !== undefined) {
    user.profilePhoto = updates.profilePhoto as IUser['profilePhoto'];
    anyUpdateApplied = true;
  }

  if (updates.availableNow !== undefined) {
    user.availableNow = updates.availableNow;
    anyUpdateApplied = true;
  }

  if (updates.serviceRadius !== undefined) {
    user.serviceRadius = updates.serviceRadius;
    anyUpdateApplied = true;
  }

  if (!anyUpdateApplied) {
    return {
      error: {
        body: { message: 'No valid updates provided' },
        status: 400,
      },
    };
  }

  if (locationActuallyUpdated) {
    user.markModified?.('location');
    user.markModified?.('locationHistory');
    user.markModified?.('lastLocationUpdate');
  }

  return {
    locationActuallyUpdated,
    anyUpdateApplied,
  };
}
