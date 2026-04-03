'use client';

import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';

import type {
  JobSuggestion,
  LocationHistoryResponse,
  LocationPoint,
  ReverseGeocodeResponse,
} from './useLocationTracking.types';

type LocationApiOptions = {
  enableSuggestions: boolean;
  setLocationHistory: Dispatch<SetStateAction<LocationPoint[]>>;
  setCurrentLocation: Dispatch<SetStateAction<LocationPoint | null>>;
  setJobSuggestions: Dispatch<SetStateAction<JobSuggestion[]>>;
  setLastUpdate: Dispatch<SetStateAction<Date | null>>;
};

type LocationApiResult = {
  fetchLocationData: (includeSuggestions?: boolean) => Promise<void>;
  reverseGeocode: (
    latitude: number,
    longitude: number
  ) => Promise<ReverseGeocodeResponse | null>;
  updateLocationOnServer: (location: LocationPoint) => Promise<LocationPoint | undefined>;
};

export function useLocationTrackingApi({
  enableSuggestions,
  setLocationHistory,
  setCurrentLocation,
  setJobSuggestions,
  setLastUpdate,
}: LocationApiOptions): LocationApiResult {
  const fetchLocationData = useCallback(
    async (includeSuggestions = enableSuggestions) => {
      try {
        const params = new URLSearchParams({
          limit: '20',
          includeSuggestions: includeSuggestions.toString(),
        });

        const response = await fetch(`/api/user/location/history?${params}`);
        if (!response.ok) return;

        const result = (await response.json()) as LocationHistoryResponse;
        setLocationHistory(result.data?.history ?? []);
        setCurrentLocation(result.data?.current ?? null);
        setJobSuggestions(result.data?.suggestions?.jobs ?? []);
      } catch (error) {
        console.error('Error fetching location data:', error);
      }
    },
    [enableSuggestions, setLocationHistory, setCurrentLocation, setJobSuggestions]
  );

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number): Promise<ReverseGeocodeResponse | null> => {
      try {
        const response = await fetchWithCsrf('/api/location/reverse-geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude }),
        });

        if (!response.ok) return null;
        return (await response.json()) as ReverseGeocodeResponse;
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
      }
    },
    []
  );

  const updateLocationOnServer = useCallback(
    async (location: LocationPoint): Promise<LocationPoint | undefined> => {
      const response = await fetchWithCsrf('/api/user/location/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', location }),
      });

      if (!response.ok) throw new Error('Failed to update location on server');

      const result = (await response.json()) as { data?: { location?: LocationPoint } };
      setLastUpdate(new Date());
      return result.data?.location;
    },
    [setLastUpdate]
  );

  return { fetchLocationData, reverseGeocode, updateLocationOnServer };
}
