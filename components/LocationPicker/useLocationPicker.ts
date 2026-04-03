'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type {
  Coordinates,
  LocationStep,
  LocationValue,
  SelectedLocation,
  UseLocationPickerResult,
} from './location.types';
import {
  getDeviceInfo,
  isLocationAccurate,
  toSelectedLocation,
} from './locationPicker.utils';
import { useLocationAutocomplete } from './useLocationAutocomplete';
import { useLocationGeocode } from './useLocationGeocode';

export function useLocationPicker(
  onLocationSelect: (location: LocationValue | null) => void,
  initialLocation: LocationValue | null = null
): UseLocationPickerResult {
  const [currentStepState, setCurrentStepState] = useState<LocationStep>('initial');
  const [gpsLocation, setGpsLocation] = useState<Coordinates | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(
    toSelectedLocation(initialLocation)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (
      initialLocation &&
      (!selectedLocation || JSON.stringify(initialLocation) !== JSON.stringify(selectedLocation))
    ) {
      const normalizedLocation = toSelectedLocation(initialLocation);
      if (normalizedLocation) {
        setSelectedLocation(normalizedLocation);
      }
    }
  }, [initialLocation, selectedLocation]);

  const { reverseGeocode } = useLocationGeocode({ setSelectedLocation, setError });

  const { autocompleteRef } = useLocationAutocomplete({
    currentStepState,
    onLocationSelect,
    setCurrentStepState,
    setError,
    setSelectedLocation,
  });

  const getLocationMessage = useCallback(
    (hasLocation = false): { type: 'info'; message: string } => {
      const device = getDeviceInfo();
      if (!hasLocation || device.isDesktop) {
        return {
          type: 'info',
          message: 'Seems like you are using a laptop. Try maps for better accuracy.',
        };
      }
      return { type: 'info', message: 'Use map for precise location.' };
    },
    []
  );

  const getCurrentLocation = useCallback((): void => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setCurrentStepState('gps-failed');
      return;
    }

    setIsLoading(true);
    setCurrentStepState('gps-detecting');
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy: currentAccuracy } = position.coords;

        setGpsLocation({ lat: latitude, lng: longitude });
        setAccuracy(currentAccuracy);
        setIsLoading(false);

        await reverseGeocode(latitude, longitude);

        if (isLocationAccurate(currentAccuracy)) {
          setCurrentStepState('gps-success');
          return;
        }
        setCurrentStepState('gps-failed');
      },
      (geolocationError) => {
        setIsLoading(false);
        setCurrentStepState('gps-failed');

        let errorMessage = 'Failed to get location';
        switch (geolocationError.code) {
          case geolocationError.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case geolocationError.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Try using map selection.';
            break;
          case geolocationError.TIMEOUT:
            errorMessage = 'Location request timed out. Try again or use map selection.';
            break;
          default:
            break;
        }

        setError(errorMessage);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [reverseGeocode]);

  const confirmCurrentLocation = useCallback((): void => {
    if (!selectedLocation) return;
    onLocationSelect(selectedLocation);
    setCurrentStepState('initial');
    toast.success('Location confirmed!');
  }, [onLocationSelect, selectedLocation]);

  const openMapModal = useCallback((): void => setShowMapModal(true), []);
  const closeMapModal = useCallback((): void => setShowMapModal(false), []);

  const confirmMapSelection = useCallback((): void => {
    if (!selectedLocation) return;
    onLocationSelect(selectedLocation);
    setShowMapModal(false);
    setCurrentStepState('initial');
    toast.success('Location confirmed');
  }, [onLocationSelect, selectedLocation]);

  const resetSelection = useCallback((): void => {
    setCurrentStepState('initial');
    setGpsLocation(null);
    setAccuracy(null);
    setSelectedLocation(null);
    setError('');
    if (autocompleteRef.current) {
      autocompleteRef.current.value = '';
    }
    onLocationSelect(null);
  }, [onLocationSelect, autocompleteRef]);

  return {
    currentStep: currentStepState,
    gpsLocation,
    accuracy,
    selectedLocation,
    isLoading,
    showMapModal,
    error,
    autocompleteRef,
    setCurrentStep: (step: LocationStep) => setCurrentStepState(step),
    clearError: () => setError(''),
    getLocationMessage,
    getCurrentLocation,
    openMapModal,
    closeMapModal,
    confirmCurrentLocation,
    confirmMapSelection,
    resetSelection,
    reverseGeocode,
  };
}
