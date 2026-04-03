'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

import { LOCATION_OPTIONS } from './useLocationTracking.types';
import type {
  LocationPoint,
  LocationTrackingOptions,
  UseLocationTrackingResult,
} from './useLocationTracking.types';
import { useLocationTrackingApi } from './useLocationTrackingApi';
import { useLocationTrackingControls } from './useLocationTrackingControls';
import { useLocationTrackingRealtime } from './useLocationTrackingRealtime';
import type { JobSuggestion } from './useLocationTracking.types';
import { getErrorMessage } from './useLocationTracking.types';

export function useLocationTracking(
  options: LocationTrackingOptions = {}
): UseLocationTrackingResult {
  const { data: session } = useSession();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [jobSuggestions, setJobSuggestions] = useState<JobSuggestion[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('prompt');

  const {
    autoStart = true,
    enableSuggestions = true,
    showNotifications = true,
    accuracyThreshold = 100,
  } = options;

  const { fetchLocationData, reverseGeocode, updateLocationOnServer } = useLocationTrackingApi({
    enableSuggestions,
    setLocationHistory,
    setCurrentLocation,
    setJobSuggestions,
    setLastUpdate,
  });

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return false;
    }

    try {
      if (!navigator.permissions) return true;

      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(permission.state);

      permission.onchange = () => {
        setPermissionStatus(permission.state);
      };

      return permission.state !== 'denied';
    } catch (err) {
      console.error('Error checking geolocation permission:', err);
      return true;
    }
  }, []);

  const getCurrentPosition = useCallback((): Promise<LocationPoint> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(),
          };

          if (location.accuracy <= accuracyThreshold) {
            resolve(location);
          } else {
            reject(new Error(`Location accuracy too low: ${Math.round(location.accuracy)}m`));
          }
        },
        (geoError) => reject(new Error(geoError.message)),
        LOCATION_OPTIONS
      );
    });
  }, [accuracyThreshold]);

  const updateLocationNow = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const position = await getCurrentPosition();
      const addressInfo = await reverseGeocode(position.latitude, position.longitude);

      const locationData: LocationPoint = {
        ...position,
        address: addressInfo?.formatted_address,
        city: addressInfo?.city,
        state: addressInfo?.state,
      };

      setCurrentLocation(locationData);
      await updateLocationOnServer(locationData);

      if (enableSuggestions) {
        setTimeout(() => void fetchLocationData(true), 1000);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
    }
  }, [
    enableSuggestions,
    fetchLocationData,
    getCurrentPosition,
    reverseGeocode,
    updateLocationOnServer,
  ]);

  const { startTracking, stopTracking } = useLocationTrackingControls({
    accuracyThreshold,
    enableContinuousWatch: options.enableContinuousWatch,
    showNotifications,
    checkPermission,
    updateLocationNow,
    fetchLocationData,
    setCurrentLocation,
    setIsTracking,
    setError,
  });

  useLocationTrackingRealtime({
    userId: session?.user?.id,
    isTracking,
    updateLocationNow,
    enableSuggestions,
    showNotifications,
    fetchLocationData,
  });

  useEffect(() => {
    if (!session?.user?.id || !autoStart) return;

    void fetchLocationData();

    const savedPreference =
      typeof window !== 'undefined' ? localStorage.getItem('fixly_location_tracking') : null;

    if (savedPreference === 'enabled') {
      void startTracking();
    }
  }, [session?.user?.id, autoStart, fetchLocationData, startTracking]);

  useEffect(() => {
    if (session?.user?.id && typeof window !== 'undefined') {
      localStorage.setItem('fixly_location_tracking', isTracking ? 'enabled' : 'disabled');
    }
  }, [isTracking, session?.user?.id]);

  return {
    isTracking,
    currentLocation,
    locationHistory,
    jobSuggestions,
    lastUpdate,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    updateLocationNow,
    fetchLocationData,
    canTrack:
      permissionStatus !== 'denied' && typeof navigator !== 'undefined' && !!navigator.geolocation,
  };
}
