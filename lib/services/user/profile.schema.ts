import { Types } from 'mongoose';

import type { IUser } from '@/types/User';

export type SessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  authMethod?: string;
  isRegistered?: boolean;
  needsOnboarding?: boolean;
};

export type NotificationItem = {
  read?: boolean;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationInput = {
  lat?: unknown;
  lng?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  city?: unknown;
  state?: unknown;
  name?: unknown;
  accuracy?: unknown;
  source?: unknown;
  doorNo?: unknown;
  street?: unknown;
  route?: unknown;
  district?: unknown;
  locality?: unknown;
  postalCode?: unknown;
  postal_code?: unknown;
  formatted_address?: unknown;
  address?: unknown;
};

export type ProfileUpdateBody = {
  name?: unknown;
  bio?: unknown;
  location?: unknown;
  skills?: unknown;
  preferences?: unknown;
  profilePhoto?: unknown;
  availableNow?: unknown;
  serviceRadius?: unknown;
};

export type UpdatePayload = {
  name?: string;
  bio?: string;
  location?: LocationInput;
  skills?: string[];
  preferences?: Record<string, unknown>;
  profilePhoto?: Record<string, unknown> | null;
  availableNow?: boolean;
  serviceRadius?: number;
};

export type LocationHistoryEntry = {
  coordinates: Coordinates;
  address: string;
  city: string;
  state: string;
  source: string;
  accuracy?: number;
  timestamp: Date;
  deviceInfo: {
    type: string;
    userAgent: string;
  };
};

export type UserDocument = IUser & {
  _id: Types.ObjectId;
  createdAt?: Date;
  picture?: string | null;
  firebaseUid?: string;
  notifications?: NotificationItem[];
  save: () => Promise<unknown>;
  markModified?: (path: string) => void;
};

export type LocationSource = 'gps' | 'manual' | 'home' | 'network';

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function toTrimmedString(value: unknown): string | null {
  return isString(value) ? value.trim() : null;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractCoordinates(location: LocationInput): { lat: number; lng: number } | null {
  const lat = toNumber(location.lat ?? location.latitude);
  const lng = toNumber(location.lng ?? location.longitude);

  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export function buildAddressSummary(location: LocationInput): string {
  const formattedAddress = toTrimmedString(location.formatted_address);
  if (formattedAddress) return formattedAddress;

  const fallbackAddress = toTrimmedString(location.address);
  if (fallbackAddress) return fallbackAddress;

  const city = toTrimmedString(location.city ?? location.name) ?? '';
  const state = toTrimmedString(location.state) ?? '';
  return `${city}, ${state}`.trim().replace(/^,\s*|,\s*$/g, '');
}

export function isMongoObjectId(id: string): boolean {
  return OBJECT_ID_REGEX.test(id);
}

export function normalizeLocationSource(value: unknown): LocationSource {
  const normalized = toTrimmedString(value)?.toLowerCase();
  if (
    normalized === 'gps' ||
    normalized === 'manual' ||
    normalized === 'home' ||
    normalized === 'network'
  ) {
    return normalized;
  }

  return 'manual';
}

export function isTemporarySessionId(id: string): boolean {
  return id.startsWith('temp_') || id.startsWith('tmp_') || id.startsWith('pending_google:');
}

export function normalizePhotoUrl(
  profilePhoto: unknown,
  fallbackPicture: string | null | undefined
): string | null {
  if (isPlainObject(profilePhoto)) {
    const url = toTrimmedString(profilePhoto.url);
    if (url) return url;
  }

  const fallback = toTrimmedString(fallbackPicture);
  return fallback ?? null;
}

export function parseError(error: unknown): Error & { name?: string } {
  if (error instanceof Error) return error as Error & { name?: string };
  return new Error('Unknown error');
}

export function parseProfileUpdateBody(body: unknown): ProfileUpdateBody | null {
  if (!isPlainObject(body)) {
    return null;
  }

  return body as ProfileUpdateBody;
}
