'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

import { buildGeocodeCacheKey, getCachedGeocode, setCachedGeocode } from './GeocodeCache';
import type { GoogleGeocoderResult, SelectedLocation } from './location.types';
import {
  buildLocation,
  getGoogleMaps,
  isLocationInIndia,
  parseAddressComponents,
} from './locationPicker.utils';

type UseLocationGeocodeParams = {
  setSelectedLocation: (location: SelectedLocation | null) => void;
  setError: (error: string) => void;
};

type UseLocationGeocodeResult = {
  reverseGeocode: (lat: number, lng: number) => Promise<void>;
};

export function useLocationGeocode({
  setSelectedLocation,
  setError,
}: UseLocationGeocodeParams): UseLocationGeocodeResult {
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<void> => {
      if (typeof window === 'undefined') return;

      let retries = 0;
      const maxRetries = 10;
      while (!getGoogleMaps()?.Geocoder && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries += 1;
      }

      const mapsApi = getGoogleMaps();
      if (!mapsApi?.Geocoder) {
        setSelectedLocation({
          lat,
          lng,
          address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          formatted: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          formatted_address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          city: 'GPS Location',
          state: '',
          name: 'GPS Location',
          coordinates: { lat, lng },
          components: {},
          isInIndia: isLocationInIndia(lat, lng),
        });
        return;
      }

      const cacheKey = buildGeocodeCacheKey(lat, lng);
      const cachedLocation = getCachedGeocode(cacheKey);
      if (cachedLocation) {
        setSelectedLocation(cachedLocation);
        return;
      }

      try {
        const geocoder = new mapsApi.Geocoder();
        const response = await new Promise<GoogleGeocoderResult>((resolve, reject) => {
          geocoder.geocode(
            { location: { lat, lng } },
            (results: GoogleGeocoderResult[], status: string) => {
              if (status === 'OK' && results[0]) {
                resolve(results[0]);
                return;
              }
              reject(new Error('Geocoding failed'));
            }
          );
        });

        const components = parseAddressComponents(response.address_components);
        const location = buildLocation(lat, lng, response.formatted_address, components);

        if (!location.isInIndia) {
          toast.error(
            'Fixly is currently available only in India. Please select a location within India.',
            { duration: 4000 }
          );
          setError('Location outside India selected. Please choose a location within India.');
          return;
        }

        setCachedGeocode(cacheKey, location);
        setSelectedLocation(location);
      } catch (reverseGeocodeError: unknown) {
        console.error('Reverse geocoding failed:', reverseGeocodeError);
      }
    },
    [setSelectedLocation, setError]
  );

  return { reverseGeocode };
}
