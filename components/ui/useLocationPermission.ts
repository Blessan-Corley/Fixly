'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  checkLocationPermission,
  clearUserLocation,
  getUserLocation,
  loadUserLocation,
  saveLocationRejection,
  saveUserLocation,
  type UserLocation,
} from '../../utils/locationUtils';

import {
  clearLocationFromApi,
  isDeniedMessage,
  saveLocationToApi,
  toErrorMessage,
  type LocationState,
} from './LocationPermission.utils';

export interface UseLocationPermissionResult {
  internalShowBanner: boolean;
  setInternalShowBanner: (value: boolean) => void;
  locationState: LocationState;
  userLocation: UserLocation | null;
  showPermissionModal: boolean;
  setShowPermissionModal: (value: boolean) => void;
  loading: boolean;
  error: string;
  requestLocation: () => Promise<void>;
  disableLocation: () => Promise<void>;
}

export function useLocationPermission(
  showBannerProp: boolean,
  onLocationUpdate?: (location: UserLocation | null) => void
): UseLocationPermissionResult {
  const [internalShowBanner, setInternalShowBanner] = useState<boolean>(showBannerProp);
  const [locationState, setLocationState] = useState<LocationState>('unknown');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const initializeLocation = useCallback(async (): Promise<void> => {
    const cachedLocation = loadUserLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
      setLocationState('granted');
      onLocationUpdate?.(cachedLocation);
      return;
    }

    const permission = await checkLocationPermission();
    if (permission === 'granted') {
      setLocationState('granted');
      return;
    }

    if (permission === 'denied') {
      setLocationState('denied');
      return;
    }

    setLocationState('unknown');
  }, [onLocationUpdate]);

  useEffect(() => {
    void initializeLocation();
  }, [initializeLocation]);

  const requestLocation = async (): Promise<void> => {
    setLoading(true);
    setError('');
    setLocationState('requesting');

    try {
      const location = await getUserLocation();
      setUserLocation(location);
      setLocationState('granted');
      saveUserLocation(location);
      await saveLocationToApi(location);
      onLocationUpdate?.(location);

      toast.success('Location enabled. Showing jobs near you.');
      setShowPermissionModal(false);
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      setError(message);
      setLocationState(isDeniedMessage(message) ? 'denied' : 'error');

      if (isDeniedMessage(message)) {
        saveLocationRejection();
        toast.error('Location access denied. Enable it in browser settings and try again.');
      } else {
        toast.error(`Unable to get location: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const disableLocation = async (): Promise<void> => {
    setUserLocation(null);
    setLocationState('denied');
    clearUserLocation();
    await clearLocationFromApi();

    onLocationUpdate?.(null);
    setShowPermissionModal(false);
    toast.info('Location disabled. Showing all jobs.');
  };

  return {
    internalShowBanner,
    setInternalShowBanner,
    locationState,
    userLocation,
    showPermissionModal,
    setShowPermissionModal,
    loading,
    error,
    requestLocation,
    disableLocation,
  };
}
