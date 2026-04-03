import { z } from 'zod';

import { respond } from '@/lib/api';
import { logger } from '@/lib/logger';
import { invalidateUserCache, withCache } from '@/lib/redisCache';
import {
  getUserLocationHistory,
  getUserJobSuggestions,
  updateUserLocation,
  startUserLocationTracking,
  stopUserLocationTracking,
} from '@/lib/services/locationHistoryService';

export type UserLocationHistoryContext = {
  userId: string;
};

export type LocationInput = {
  latitude?: unknown;
  longitude?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  accuracy?: unknown;
};

export const VALID_ACTIONS = new Set(['update', 'start_tracking', 'stop_tracking']);

export const locationHistoryPostSchema = z.object({
  action: z.unknown().optional(),
  location: z.unknown().optional(),
});

export const typedGetUserLocationHistory = getUserLocationHistory as (
  userId: string,
  limit?: number
) => Promise<Record<string, unknown>>;
export const typedGetUserJobSuggestions = getUserJobSuggestions as (userId: string) => Promise<unknown>;
export const typedUpdateUserLocation = updateUserLocation as (
  userId: string,
  location: Record<string, unknown>
) => Promise<unknown>;
export const typedStartUserLocationTracking = startUserLocationTracking as (
  userId: string,
  initialLocation?: unknown
) => Promise<unknown>;
export const typedStopUserLocationTracking = stopUserLocationTracking as (
  userId: string
) => Promise<unknown>;

export function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function parseError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('Unknown error');
}

export function parseLimit(value: string | null, defaultLimit: number, maxLimit: number): number {
  if (!value) return defaultLimit;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

export function normalizeLocation(input: unknown): LocationInput | null {
  if (!isPlainObject(input)) return null;
  return input as LocationInput;
}

export function validateLocationCoordinates(
  location: LocationInput
): { latitude: number; longitude: number } | null {
  const latitude = toNumber(location.latitude);
  const longitude = toNumber(location.longitude);

  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

export function withUserIdHeader(request: Request, userId: string): Request {
  const headers = new Headers(request.headers);
  headers.set('x-user-id', userId);
  return new Request(request.url, {
    method: request.method,
    headers,
  });
}

export async function invalidateUserLocationHistoryCaches(userId: string): Promise<void> {
  const results = await Promise.allSettled([
    invalidateUserCache(userId, '/api/user/location/history'),
    invalidateUserCache(userId, '/api/user/location'),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn('User location history cache invalidation failed:', result.reason);
    }
  }
}

export const getLocationHistoryCached = withCache<UserLocationHistoryContext>(
  async (request: Request, context: UserLocationHistoryContext): Promise<Response> => {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'), 20, 100);
    const includeSuggestions = searchParams.get('includeSuggestions') === 'true';

    const locationData = await typedGetUserLocationHistory(context.userId, limit);

    let suggestions: unknown = null;
    if (includeSuggestions) {
      suggestions = await typedGetUserJobSuggestions(context.userId);
    }

    return respond({
      success: true,
      data: {
        ...locationData,
        suggestions,
      },
    });
  },
  {
    ttl: 20,
    version: 'v2',
    userSpecific: true,
  }
);
