// Shared types for location utilities

export type Coordinates = {
  lat: number;
  lng: number;
};

export type IndiaBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type MajorIndianCity = {
  name: string;
  lat: number;
  lng: number;
  state: string;
};

export type NearestCity = MajorIndianCity & {
  distance: number;
};

export type LocationLike = {
  lat?: number;
  lng?: number;
  name?: string;
  locality?: string;
  city?: string;
  state?: string;
  [key: string]: unknown;
};

export type LocationValidationResult = { valid: true } | { valid: false; error: string };

export type TouchPointLike = {
  clientX: number;
  clientY: number;
};

export type TouchEventLike = {
  touches?: ArrayLike<TouchPointLike>;
  changedTouches?: ArrayLike<TouchPointLike>;
};
