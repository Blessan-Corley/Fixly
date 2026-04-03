export type LocationType = 'gps' | 'manual' | 'home' | 'network';

export type LocationEntry = {
  lat: number;
  lng: number;
  address: string | null;
  locationType: LocationType;
  timestamp: string;
  accuracy: number | null;
};

export type HomeAddress = {
  doorNo?: string;
  street?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  formattedAddress?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  setAt?: string;
  locationType?: 'home';
};

export type LocationInsights = {
  totalLocations: number;
  recentActivityCount: number;
  hasHomeAddress: boolean;
  mostFrequentArea: {
    area: string;
    visits: number;
  } | null;
  averageMovementDistance: number;
  lastUpdated: string | null;
};
