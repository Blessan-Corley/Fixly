'use client';

import type {
  AddressComponents,
  DeviceInfo,
  GoogleAddressComponent,
  GoogleMapsNamespace,
  SelectedLocation,
} from './location.types';

export const getGoogleMaps = (): GoogleMapsNamespace | null => {
  if (typeof window === 'undefined') return null;
  return window.google?.maps ?? null;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseAddressComponents = (
  components: GoogleAddressComponent[] = []
): AddressComponents => {
  const result: AddressComponents = {};

  components.forEach((component) => {
    const { types } = component;
    if (types.includes('street_number')) result.streetNumber = component.long_name;
    if (types.includes('route')) result.street = component.long_name;
    if (types.includes('locality')) result.city = component.long_name;
    if (types.includes('sublocality') && !result.city) result.city = component.long_name;
    if (types.includes('administrative_area_level_2') && !result.city) {
      result.city = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) result.state = component.long_name;
    if (types.includes('postal_code')) result.pincode = component.long_name;
    if (types.includes('country')) result.country = component.long_name;
    if (types.includes('country')) result.countryCode = component.short_name;
  });

  return result;
};

export const isLocationInIndia = (
  lat: number,
  lng: number,
  addressComponents: AddressComponents | null = null
): boolean => {
  const indiaBounds = { north: 37.6, south: 6.4, east: 97.25, west: 68.7 };

  const isInBounds =
    lat >= indiaBounds.south &&
    lat <= indiaBounds.north &&
    lng >= indiaBounds.west &&
    lng <= indiaBounds.east;

  const isIndiaByAddress = addressComponents?.countryCode
    ? addressComponents.countryCode === 'IN'
    : true;

  return isInBounds && isIndiaByAddress;
};

export const buildLocation = (
  lat: number,
  lng: number,
  formattedAddress: string,
  components: AddressComponents
): SelectedLocation => ({
  lat,
  lng,
  address: formattedAddress,
  formatted: formattedAddress,
  formatted_address: formattedAddress,
  city: components.city || formattedAddress.split(',')[0] || '',
  state: components.state || '',
  name: components.city || formattedAddress.split(',')[0] || 'Selected Location',
  coordinates: { lat, lng },
  components,
  isInIndia: isLocationInIndia(lat, lng, components),
});

export const getDeviceInfo = (): DeviceInfo => {
  const { userAgent } = navigator;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android.*Tablet|Surface/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  return {
    type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    isMobile,
    isTablet,
    isDesktop,
    hasGoodGPS: isMobile,
    userAgent,
  };
};

export const isLocationAccurate = (value: number | null): boolean => {
  const device = getDeviceInfo();
  const threshold = device.isMobile ? 1000 : 5000;
  return value !== null && value <= threshold;
};

export const toSelectedLocation = (value: unknown): SelectedLocation | null => {
  if (!isRecord(value)) return null;

  const coordinates = isRecord(value.coordinates) ? value.coordinates : null;
  const latitude =
    typeof value.lat === 'number'
      ? value.lat
      : coordinates && typeof coordinates.lat === 'number'
        ? coordinates.lat
        : null;
  const longitude =
    typeof value.lng === 'number'
      ? value.lng
      : coordinates && typeof coordinates.lng === 'number'
        ? coordinates.lng
        : null;
  const address =
    typeof value.address === 'string'
      ? value.address
      : typeof value.formatted === 'string'
        ? value.formatted
        : typeof value.formatted_address === 'string'
          ? value.formatted_address
          : '';

  if (latitude === null || longitude === null || !address) return null;

  const componentsValue = isRecord(value.components)
    ? (value.components as AddressComponents)
    : {};

  return {
    lat: latitude,
    lng: longitude,
    address,
    formatted: typeof value.formatted === 'string' ? value.formatted : address,
    formatted_address:
      typeof value.formatted_address === 'string' ? value.formatted_address : address,
    city: typeof value.city === 'string' ? value.city : '',
    state: typeof value.state === 'string' ? value.state : '',
    name: typeof value.name === 'string' ? value.name : address,
    coordinates:
      coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number'
        ? { lat: coordinates.lat, lng: coordinates.lng }
        : { lat: latitude, lng: longitude },
    components: componentsValue,
    isInIndia: Boolean(value.isInIndia),
  };
};
