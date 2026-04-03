import type mongoose from 'mongoose';
import type { Model } from 'mongoose';

export type LocationSource = 'gps' | 'ip' | 'manual';

export interface CurrentLocation {
  lat?: number;
  lng?: number;
  accuracy?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface LocationPreferences {
  maxTravelDistance: number;
  preferredCities: string[];
  autoLocationEnabled: boolean;
  locationSharingConsent: boolean;
}

export interface LocationPrivacy {
  shareExactLocation: boolean;
  shareApproximateLocation: boolean;
  trackLocationHistory: boolean;
}

export interface LocationHistoryEntry {
  lat?: number;
  lng?: number;
  timestamp: Date;
  accuracy?: number;
  source: LocationSource;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isSignificantMove: boolean;
  distanceFromPrevious?: number | null;
}

export interface RecentLocationEntry {
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
  timestamp?: Date;
  usageCount: number;
}

export interface IpLocation {
  lat?: number;
  lng?: number;
  city?: string;
  country?: string;
  timestamp?: Date;
}

export interface LocationPreference {
  user: mongoose.Types.ObjectId | string;
  currentLocation: CurrentLocation;
  preferences: LocationPreferences;
  privacy: LocationPrivacy;
  locationHistory: LocationHistoryEntry[];
  recentLocations: RecentLocationEntry[];
  lastUpdated: Date;
  lastLocationUpdate?: Date;
  ipLocation?: IpLocation;
}

export interface LocationUpdatePayload extends CurrentLocation {
  source?: LocationSource;
}

export type LocationPreferenceDocument = mongoose.HydratedDocument<
  LocationPreference,
  LocationPreferenceMethods
>;

export interface LocationPreferenceMethods {
  isLocationRecent(): boolean;
  updateLocation(locationData: LocationUpdatePayload): Promise<LocationPreferenceDocument>;
}

export interface LocationPreferenceModel
  extends Model<LocationPreference, object, LocationPreferenceMethods> {
  findNearbyUsers(
    lat: number,
    lng: number,
    radiusKm?: number
  ): Promise<LocationPreferenceDocument[]>;
}
