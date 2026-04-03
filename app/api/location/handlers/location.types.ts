import { z } from 'zod';

export type CachedLocationContext = {
  userId: string;
};

export type LocationDocument = {
  currentLocation?: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
  };
  preferences: {
    maxTravelDistance: number;
    autoLocationEnabled: boolean;
    locationSharingConsent: boolean;
  };
  privacy: {
    shareExactLocation: boolean;
    shareApproximateLocation: boolean;
    trackLocationHistory: boolean;
  };
  lastLocationUpdate?: Date;
  locationHistory?: unknown[];
  isLocationRecent: () => boolean;
  updateLocation: (payload: Record<string, unknown>) => Promise<unknown>;
  save: () => Promise<unknown>;
};

export const LocationPayloadSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^[0-9]{6}$/).optional(),
  consent: z.boolean(),
});

export const LocationPreferencesPayloadSchema = z.object({
  maxTravelDistance: z.coerce.number().int().min(1).max(100).optional(),
  autoLocationEnabled: z.boolean().optional(),
  locationSharingConsent: z.boolean().optional(),
  shareExactLocation: z.boolean().optional(),
  shareApproximateLocation: z.boolean().optional(),
  trackLocationHistory: z.boolean().optional(),
});
