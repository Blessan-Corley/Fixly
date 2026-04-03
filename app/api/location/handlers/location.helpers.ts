import { ok } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { invalidateUserCache, withCache } from '@/lib/redisCache';
import LocationPreference from '@/models/LocationPreference';

import type { CachedLocationContext, LocationDocument } from './location.types';

export function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

export function clampInteger(value: unknown, min: number, max: number): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(typeof value === 'string' ? value : '', 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function withUserIdHeader(request: Request, userId: string): Request {
  const headers = new Headers(request.headers);
  headers.set('x-user-id', userId);
  return new Request(request.url, { method: request.method, headers });
}

export async function invalidateLocationUserCache(userId: string): Promise<void> {
  const results = await Promise.allSettled([invalidateUserCache(userId, '/api/location')]);
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn('Location cache invalidation failed:', result.reason);
    }
  }
}

export const getLocationCached = withCache<CachedLocationContext>(
  async (_request: Request, context: CachedLocationContext): Promise<Response> => {
    await connectDB();

    const locationPrefs = (await LocationPreference.findOne({ user: context.userId }).select(
      '-locationHistory -ipLocation'
    )) as LocationDocument | null;

    if (!locationPrefs) {
      return ok({
        success: true,
        data: {
          hasLocation: false,
          preferences: {
            maxTravelDistance: 25,
            autoLocationEnabled: false,
            locationSharingConsent: false,
          },
        },
      });
    }

    const hasCoordinates =
      typeof locationPrefs.currentLocation?.lat === 'number' &&
      typeof locationPrefs.currentLocation?.lng === 'number';

    return ok({
      success: true,
      data: {
        hasLocation: hasCoordinates,
        currentLocation: locationPrefs.privacy.shareApproximateLocation
          ? {
              city: locationPrefs.currentLocation?.city,
              state: locationPrefs.currentLocation?.state,
              lat: locationPrefs.privacy.shareExactLocation
                ? locationPrefs.currentLocation?.lat
                : undefined,
              lng: locationPrefs.privacy.shareExactLocation
                ? locationPrefs.currentLocation?.lng
                : undefined,
            }
          : null,
        preferences: locationPrefs.preferences,
        privacy: locationPrefs.privacy,
        lastUpdated: locationPrefs.lastLocationUpdate,
        isRecent: locationPrefs.isLocationRecent(),
      },
    });
  },
  { ttl: 30, version: 'v2', userSpecific: true }
);
