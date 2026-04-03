import { z } from 'zod';

export type UserLocationCacheContext = {
  userId: string;
};

export type HomeAddressRequestBody = {
  doorNo?: unknown;
  street?: unknown;
  district?: unknown;
  state?: unknown;
  postalCode?: unknown;
  formattedAddress?: unknown;
  coordinates?: unknown;
};

export type HomeAddressPayload = {
  doorNo: string;
  street: string;
  district: string;
  state: string;
  postalCode: string;
  formattedAddress?: string;
  coordinates?: { lat: number; lng: number };
};

export const VALID_LOCATION_TYPES = new Set(['gps', 'manual', 'home', 'network']);
export const INDIAN_POSTAL_CODE_REGEX = /^[1-9][0-9]{5}$/;
export const LOCATION_TYPES = ['current', 'home', 'history', 'recent', 'insights', 'all'] as const;

export const locationQuerySchema = z.object({
  type: z.enum(LOCATION_TYPES).optional(),
  limit: z.string().optional(),
});

export const locationRequestSchema = z.object({
  lat: z.unknown().optional(),
  lng: z.unknown().optional(),
  address: z.unknown().optional(),
  locationType: z.unknown().optional(),
});

export const homeAddressRequestSchema = z.object({
  doorNo: z.unknown().optional(),
  street: z.unknown().optional(),
  district: z.unknown().optional(),
  state: z.unknown().optional(),
  postalCode: z.unknown().optional(),
  formattedAddress: z.unknown().optional(),
  coordinates: z.unknown().optional(),
});
