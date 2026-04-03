export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationInput = {
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  accuracy?: number | string | null;
};

export type LocationEntry = {
  coordinates: Coordinates;
  address: string | null;
  city: string | null;
  state: string | null;
  accuracy: number | null;
  timestamp: Date;
};

export type LocationHistoryResult = {
  current: LocationEntry | null;
  history: LocationEntry[];
  source: 'cache' | 'database' | 'error';
};

export type JobSuggestionsResult = {
  jobs: unknown[];
  location: unknown;
  generatedAt: string;
  radius?: number;
  source: 'cache' | 'fresh' | 'empty' | 'error';
};

export type LocationCachePayload = {
  current: LocationEntry;
  history: LocationEntry[];
  lastUpdate: string;
};

export type JobSuggestionsPayload = {
  jobs: unknown[];
  location: unknown;
  generatedAt: string;
  radius: number;
};

export type TrackingState = {
  active: boolean;
  intervalMs: number;
  lastUpdate?: string;
  lastLocationRequestAt?: string;
  lastSuggestionsRefreshAt?: string;
  lastNotificationAt?: string;
};

export type AblyChannelLike = {
  publish: (eventName: string, data: unknown) => Promise<unknown>;
};

export type AblyClientLike = {
  channels: {
    get: (name: string) => AblyChannelLike;
  };
};

export type UserDocLike = {
  _id?: unknown;
  location?: LocationEntry;
  locationHistory?: LocationEntry[];
  lastLocationUpdate?: Date;
  preferences?: {
    jobNotifications?: boolean;
  };
  skills?: string[];
  save: () => Promise<unknown>;
};

export type UserLeanLocation = {
  location?: LocationEntry | null;
  locationHistory?: LocationEntry[];
};
