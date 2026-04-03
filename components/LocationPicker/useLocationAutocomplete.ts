'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { env } from '@/lib/env';

import type { GoogleAutocompleteInstance, LocationStep, LocationValue, SelectedLocation } from './location.types';
import { buildLocation, getGoogleMaps, parseAddressComponents } from './locationPicker.utils';

type UseLocationAutocompleteParams = {
  currentStepState: LocationStep;
  onLocationSelect: (location: LocationValue | null) => void;
  setCurrentStepState: (step: LocationStep) => void;
  setError: (error: string) => void;
  setSelectedLocation: (location: SelectedLocation | null) => void;
};

type UseLocationAutocompleteResult = {
  autocompleteRef: React.RefObject<HTMLInputElement | null>;
};

export function useLocationAutocomplete({
  currentStepState,
  onLocationSelect,
  setCurrentStepState,
  setError,
  setSelectedLocation,
}: UseLocationAutocompleteParams): UseLocationAutocompleteResult {
  const autocompleteRef = useRef<HTMLInputElement | null>(null);
  const googleMapsLoaded = useRef<boolean>(false);
  const autocompleteInstance = useRef<GoogleAutocompleteInstance | null>(null);

  const initializeAutocomplete = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined' || !autocompleteRef.current) return;

    let placesRetries = 0;
    const maxPlacesRetries = 10;
    while (!getGoogleMaps()?.places && placesRetries < maxPlacesRetries) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      placesRetries += 1;
    }

    const mapsApi = getGoogleMaps();
    if (!mapsApi?.places?.Autocomplete) return;

    if (autocompleteInstance.current) {
      mapsApi.event.clearInstanceListeners(autocompleteInstance.current);
    }

    const autocomplete = new mapsApi.places.Autocomplete(autocompleteRef.current, {
      componentRestrictions: { country: 'IN' },
      fields: ['formatted_address', 'geometry', 'address_components'],
    });

    autocompleteInstance.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const components = parseAddressComponents(place.address_components || []);
      const formattedAddress = place.formatted_address || '';
      const location = buildLocation(lat, lng, formattedAddress, components);

      if (!location.isInIndia) {
        toast.error(
          'Fixly is currently available only in India. Please select a location within India.',
          { duration: 4000 }
        );
        setError('Address outside India selected. Please choose a location within India.');
        if (autocompleteRef.current) {
          autocompleteRef.current.value = '';
        }
        return;
      }

      setSelectedLocation(location);
      onLocationSelect(location);
      setCurrentStepState('initial');
      setError('');
      toast.success('Address selected successfully');
    });
  }, [onLocationSelect, setCurrentStepState, setError, setSelectedLocation]);

  const loadGoogleMapsAPI = useCallback((): void => {
    if (typeof window === 'undefined') return;
    if (window.google || googleMapsLoaded.current || document.querySelector('#google-maps-script')) {
      return;
    }

    googleMapsLoaded.current = true;
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}&libraries=places,marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = (): void => {
      console.log('Google Maps API loaded successfully');
    };
    script.onerror = (): void => {
      console.error('Failed to load Google Maps API');
      googleMapsLoaded.current = false;
    };

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    loadGoogleMapsAPI();

    return () => {
      const mapsApi = getGoogleMaps();
      if (autocompleteInstance.current && mapsApi) {
        mapsApi.event.clearInstanceListeners(autocompleteInstance.current);
      }
    };
  }, [loadGoogleMapsAPI]);

  useEffect(() => {
    if (currentStepState !== 'address-search') return;

    const timeoutId = window.setTimeout(() => {
      void initializeAutocomplete();
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentStepState, initializeAutocomplete]);

  return { autocompleteRef };
}
