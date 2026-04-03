export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationAddress {
  doorNo?: string;
  street?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  formattedAddress?: string;
  coordinates?: LocationCoordinates & { accuracy?: number };
  setAt?: Date;
}

export interface UserLocation {
  coordinates?: LocationCoordinates;
  address?: string;
  city?: string;
  state?: string;
  accuracy?: number;
  timestamp?: Date;
  source?: 'gps' | 'manual' | 'home' | 'network';
  homeAddress?: LocationAddress;
}

export interface UserLocationHistoryEntry {
  coordinates: LocationCoordinates;
  address?: string;
  city?: string;
  state?: string;
  source?: 'gps' | 'manual' | 'home' | 'network';
  accuracy?: number;
  timestamp?: Date;
  deviceInfo?: {
    type?: string;
    userAgent?: string;
  };
}
