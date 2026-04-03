export interface Coordinates {
  lat: number;
  lng: number;
}

export interface UserLocation extends Coordinates {
  accuracy?: number;
  city?: string;
  state?: string;
}

export interface StoredLocation extends UserLocation {
  timestamp: number;
  expiresIn: number;
  source: 'gps' | 'manual';
}

export interface CityCoordinate extends Coordinates {
  name: string;
  [key: string]: unknown;
}

export type PermissionStateResult = PermissionState | 'unsupported';
