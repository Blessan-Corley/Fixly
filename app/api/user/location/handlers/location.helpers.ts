import { NextRequest } from 'next/server';

import { badRequest, parseQuery, respond } from '@/lib/api';
import {
  getCurrentUserLocation,
  updateCurrentLocation,
  setHomeAddress,
  getHomeAddress,
  getLocationHistory,
  getRecentLocations,
  getLocationInsights,
} from '@/lib/locationTracking';
import { logger } from '@/lib/logger';
import { invalidateUserCache, withCache } from '@/lib/redisCache';

import {
  INDIAN_POSTAL_CODE_REGEX,
  VALID_LOCATION_TYPES,
  locationQuerySchema,
  type HomeAddressPayload,
  type HomeAddressRequestBody,
  type UserLocationCacheContext,
} from './location.types';

export const typedGetCurrentUserLocation = getCurrentUserLocation as (
  userId: string
) => Promise<unknown>;
export const typedUpdateCurrentLocation = updateCurrentLocation as (
  userId: string,
  lat: number,
  lng: number,
  address?: unknown,
  locationType?: unknown
) => Promise<unknown>;
export const typedSetHomeAddress = setHomeAddress as (
  userId: string,
  address: HomeAddressPayload
) => Promise<unknown>;
export const typedGetHomeAddress = getHomeAddress as (userId: string) => Promise<unknown>;
export const typedGetLocationHistory = getLocationHistory as (
  userId: string,
  limit?: number
) => Promise<unknown>;
export const typedGetRecentLocations = getRecentLocations as (userId: string) => Promise<unknown>;
export const typedGetLocationInsights = getLocationInsights as (userId: string) => Promise<unknown>;

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

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip');
  return realIp?.trim() ?? 'unknown';
}

export function parseLimitParam(value: string | null, defaultLimit: number, maxLimit: number): number {
  if (!value) return defaultLimit;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

export function isValidCoordinatePair(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function normalizeLocationType(value: unknown): string {
  const normalized = toTrimmedString(value)?.toLowerCase() ?? 'gps';
  return VALID_LOCATION_TYPES.has(normalized) ? normalized : 'gps';
}

export function normalizeHomeAddress(payload: HomeAddressRequestBody): HomeAddressPayload | null {
  const doorNo = toTrimmedString(payload.doorNo);
  const street = toTrimmedString(payload.street);
  const district = toTrimmedString(payload.district);
  const state = toTrimmedString(payload.state);
  const postalCode = toTrimmedString(payload.postalCode);

  if (!doorNo || !street || !district || !state || !postalCode) return null;
  if (!INDIAN_POSTAL_CODE_REGEX.test(postalCode)) return null;

  const normalized: HomeAddressPayload = { doorNo, street, district, state, postalCode };

  const formattedAddress = toTrimmedString(payload.formattedAddress);
  if (formattedAddress) normalized.formattedAddress = formattedAddress;

  if (isPlainObject(payload.coordinates)) {
    const lat = toNumber(payload.coordinates.lat);
    const lng = toNumber(payload.coordinates.lng);
    if (lat !== null && lng !== null && isValidCoordinatePair(lat, lng)) {
      normalized.coordinates = { lat, lng };
    }
  }

  return normalized;
}

export function withUserIdHeader(request: Request, userId: string): Request {
  const headers = new Headers(request.headers);
  headers.set('x-user-id', userId);
  return new Request(request.url, { method: request.method, headers });
}

export async function invalidateUserLocationCaches(userId: string): Promise<void> {
  const results = await Promise.allSettled([
    invalidateUserCache(userId, '/api/user/location'),
    invalidateUserCache(userId, '/api/user/location/history'),
  ]);
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn('User location cache invalidation failed:', result.reason);
    }
  }
}

export const getUserLocationCached = withCache<UserLocationCacheContext>(
  async (request: Request, context: UserLocationCacheContext): Promise<Response> => {
    const nextRequest = request instanceof NextRequest ? request : new NextRequest(request);
    const parsedQuery = parseQuery(nextRequest, locationQuerySchema);
    if ('error' in parsedQuery) return parsedQuery.error;

    const dataType = parsedQuery.data.type ?? 'current';
    const locationData: Record<string, unknown> = {};

    switch (dataType) {
      case 'current':
        locationData.current = await typedGetCurrentUserLocation(context.userId);
        break;
      case 'home':
        locationData.home = await typedGetHomeAddress(context.userId);
        break;
      case 'history': {
        const limit = parseLimitParam(parsedQuery.data.limit ?? null, 20, 100);
        locationData.history = await typedGetLocationHistory(context.userId, limit);
        break;
      }
      case 'recent':
        locationData.recent = await typedGetRecentLocations(context.userId);
        break;
      case 'insights':
        locationData.insights = await typedGetLocationInsights(context.userId);
        break;
      case 'all':
        locationData.current = await typedGetCurrentUserLocation(context.userId);
        locationData.home = await typedGetHomeAddress(context.userId);
        locationData.recent = await typedGetRecentLocations(context.userId);
        locationData.insights = await typedGetLocationInsights(context.userId);
        break;
      default:
        return badRequest('Invalid data type requested');
    }

    return respond({ success: true, data: locationData, timestamp: new Date().toISOString() });
  },
  { ttl: 20, version: 'v2', userSpecific: true }
);
