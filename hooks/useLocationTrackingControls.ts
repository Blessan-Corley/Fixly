'use client';

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';

import {
  LOCATION_OPTIONS,
  LOCATION_UPDATE_INTERVAL,
  getErrorMessage,
} from './useLocationTracking.types';
import type { LocationPoint } from './useLocationTracking.types';

type TrackingControlOptions = {
  accuracyThreshold: number;
  enableContinuousWatch: boolean | undefined;
  showNotifications: boolean;
  checkPermission: () => Promise<boolean>;
  updateLocationNow: () => Promise<void>;
  fetchLocationData: (includeSuggestions?: boolean) => Promise<void>;
  setCurrentLocation: Dispatch<SetStateAction<LocationPoint | null>>;
  setIsTracking: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
};

type TrackingControlResult = {
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
};

export function useLocationTrackingControls({
  accuracyThreshold,
  enableContinuousWatch,
  showNotifications,
  checkPermission,
  updateLocationNow,
  fetchLocationData,
  setCurrentLocation,
  setIsTracking,
  setError,
}: TrackingControlOptions): TrackingControlResult {
  const trackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const stopTracking = useCallback(async (): Promise<void> => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      await fetch('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_tracking' }),
      });
    } catch (error) {
      console.error('Failed to notify server about tracking stop:', error);
    }

    setIsTracking(false);

    if (showNotifications) {
      toast.info('Location tracking stopped');
    }
  }, [showNotifications, setIsTracking]);

  const startTracking = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        setError('Location permission is required');
        return false;
      }

      await updateLocationNow();
      trackingIntervalRef.current = setInterval(updateLocationNow, LOCATION_UPDATE_INTERVAL);

      if (navigator.geolocation && enableContinuousWatch) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const location: LocationPoint = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date(),
            };

            if (location.accuracy > accuracyThreshold) return;

            setCurrentLocation((prev) => {
              if (
                !prev ||
                Math.abs(prev.latitude - location.latitude) > 0.0005 ||
                Math.abs(prev.longitude - location.longitude) > 0.0005
              ) {
                return location;
              }
              return prev;
            });
          },
          (watchError) => {
            console.error('Watch position error:', watchError);
          },
          { ...LOCATION_OPTIONS, enableHighAccuracy: false }
        );
      }

      try {
        await fetchWithCsrf('/api/user/location/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_tracking' }),
        });
      } catch (error) {
        console.error('Failed to notify server about tracking start:', error);
      }

      setIsTracking(true);
      setError(null);

      if (showNotifications) {
        toast.success('Location tracking started', {
          description: "You'll receive relevant job suggestions every 30 minutes",
        });
      }

      void fetchLocationData(true);

      return true;
    } catch (error) {
      setError(getErrorMessage(error));
      return false;
    }
  }, [
    accuracyThreshold,
    checkPermission,
    enableContinuousWatch,
    fetchLocationData,
    setCurrentLocation,
    setError,
    setIsTracking,
    showNotifications,
    updateLocationNow,
  ]);

  useEffect(() => {
    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { startTracking, stopTracking };
}
