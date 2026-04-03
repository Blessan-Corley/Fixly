export const LOCATION_UPDATE_INTERVAL = 30 * 60 * 1000;

export const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5 * 60 * 1000,
};

export type LocationTrackingOptions = {
  autoStart?: boolean;
  enableSuggestions?: boolean;
  showNotifications?: boolean;
  accuracyThreshold?: number;
  enableContinuousWatch?: boolean;
};

export type LocationPoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date | string;
  address?: string;
  city?: string;
  state?: string;
};

export type JobSuggestion = {
  [key: string]: unknown;
};

export type LocationHistoryResponse = {
  data?: {
    history?: LocationPoint[];
    current?: LocationPoint | null;
    suggestions?: {
      jobs?: JobSuggestion[];
    };
  };
};

export type ReverseGeocodeResponse = {
  formatted_address?: string;
  city?: string;
  state?: string;
};

export type UseLocationTrackingResult = {
  isTracking: boolean;
  currentLocation: LocationPoint | null;
  locationHistory: LocationPoint[];
  jobSuggestions: JobSuggestion[];
  lastUpdate: Date | null;
  error: string | null;
  permissionStatus: PermissionState;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
  updateLocationNow: () => Promise<void>;
  fetchLocationData: (includeSuggestions?: boolean) => Promise<void>;
  canTrack: boolean;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};
