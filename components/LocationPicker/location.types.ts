'use client';

import type { MutableRefObject } from 'react';

export type LocationStep =
  | 'initial'
  | 'gps-detecting'
  | 'gps-success'
  | 'gps-failed'
  | 'map-selection'
  | 'address-search';

export type Coordinates = {
  lat: number;
  lng: number;
};

export type AddressComponents = {
  streetNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  countryCode?: string;
};

export type SelectedLocation = Coordinates & {
  address: string;
  formatted: string;
  formatted_address: string;
  city: string;
  state: string;
  name: string;
  coordinates: Coordinates;
  components: AddressComponents;
  isInIndia: boolean;
  [key: string]: unknown;
};

export type LocationValue = {
  lat?: number;
  lng?: number;
  address?: string;
  formatted?: string;
  formatted_address?: string;
  city?: string;
  state?: string;
  name?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
  components?: AddressComponents;
  isInIndia?: boolean;
  [key: string]: unknown;
};

export type EnhancedLocationSelectorProps = {
  onLocationSelect: (location: LocationValue | null) => void;
  initialLocation?: LocationValue | null;
  showLabel?: boolean;
  required?: boolean;
  className?: string;
};

export type DeviceInfo = {
  type: 'mobile' | 'tablet' | 'desktop';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasGoodGPS: boolean;
  userAgent: string;
};

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type GoogleLatLng = {
  lat: () => number;
  lng: () => number;
};

export type GoogleGeocoderResult = {
  formatted_address: string;
  address_components: GoogleAddressComponent[];
};

export type GoogleGeocoder = {
  geocode: (
    request: { location: Coordinates },
    callback: (results: GoogleGeocoderResult[], status: string) => void
  ) => void;
};

export type GoogleAutocompleteResult = {
  geometry?: { location: GoogleLatLng };
  formatted_address: string;
  address_components: GoogleAddressComponent[];
};

export type GoogleAutocompleteInstance = {
  addListener: (eventName: string, callback: () => void) => void;
  getPlace: () => GoogleAutocompleteResult;
};

export type MapClickEvent = {
  latLng: GoogleLatLng;
};

export type GoogleMapInstance = {
  addListener: (eventName: string, callback: (event: MapClickEvent) => void) => void;
};

export type GoogleMarkerInstance = {
  gmpDraggable?: boolean;
  position?: Coordinates;
  addListener: (eventName: string, callback: () => void) => void;
  setAnimation?: (animation: unknown) => void;
  setPosition?: (position: Coordinates) => void;
  getPosition?: () => GoogleLatLng | null;
};

export type GoogleMapsNamespace = {
  Geocoder: new () => GoogleGeocoder;
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
  Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  Animation: {
    DROP: unknown;
    BOUNCE: unknown;
  };
  event: {
    clearInstanceListeners: (instance: unknown) => void;
  };
  places?: {
    Autocomplete: new (
      element: HTMLInputElement,
      options: Record<string, unknown>
    ) => GoogleAutocompleteInstance;
  };
  marker?: {
    AdvancedMarkerElement?: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  };
};

export type LocationMessage = {
  type: 'info';
  message: string;
};

export type UseLocationPickerResult = {
  currentStep: LocationStep;
  gpsLocation: Coordinates | null;
  accuracy: number | null;
  selectedLocation: SelectedLocation | null;
  isLoading: boolean;
  showMapModal: boolean;
  error: string;
  autocompleteRef: MutableRefObject<HTMLInputElement | null>;
  setCurrentStep: (step: LocationStep) => void;
  clearError: () => void;
  getLocationMessage: (hasLocation?: boolean) => LocationMessage;
  getCurrentLocation: () => void;
  openMapModal: () => void;
  closeMapModal: () => void;
  confirmCurrentLocation: () => void;
  confirmMapSelection: () => void;
  resetSelection: () => void;
  reverseGeocode: (lat: number, lng: number) => Promise<void>;
};

declare global {
  interface Window {
    google?: {
      maps?: GoogleMapsNamespace;
    };
  }
}
