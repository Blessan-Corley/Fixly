'use client';

import { useEffect, useRef, useState } from 'react';

import type {
  Coordinates,
  GoogleMapInstance,
  GoogleMapsNamespace,
  GoogleMarkerInstance,
  SelectedLocation,
} from './location.types';

export type MapContext = {
  map: GoogleMapInstance;
  mapsApi: GoogleMapsNamespace;
  mapCenter: Coordinates;
  hasSpecificLocation: boolean;
};

const getGoogleMaps = (): GoogleMapsNamespace | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.google?.maps ?? null;
};

export function useMapInitializer(
  isOpen: boolean,
  gpsLocation: Coordinates | null,
  accuracy: number | null,
  selectedLocation: SelectedLocation | null,
): {
  mapRef: React.RefObject<HTMLDivElement | null>;
  markerRef: React.MutableRefObject<GoogleMarkerInstance | null>;
  mapContext: MapContext | null;
} {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const [mapContext, setMapContext] = useState<MapContext | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    let isActive = true;
    let cleanupMapsApi: GoogleMapsNamespace | null = null;
    let cleanupMap: GoogleMapInstance | null = null;

    const initializeMap = async (): Promise<void> => {
      if (!mapRef.current) {
        return;
      }

      let mapRetries = 0;
      const maxMapRetries = 10;
      while (!getGoogleMaps() && mapRetries < maxMapRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        mapRetries += 1;
      }

      const mapsApi = getGoogleMaps();
      if (!mapsApi || !mapRef.current || !isActive) {
        return;
      }

      let mapCenter: Coordinates;
      if (gpsLocation) {
        mapCenter = { lat: gpsLocation.lat, lng: gpsLocation.lng };
      } else if (selectedLocation?.coordinates) {
        mapCenter = {
          lat: selectedLocation.coordinates.lat,
          lng: selectedLocation.coordinates.lng,
        };
      } else if (
        selectedLocation &&
        typeof selectedLocation.lat === 'number' &&
        typeof selectedLocation.lng === 'number'
      ) {
        mapCenter = { lat: selectedLocation.lat, lng: selectedLocation.lng };
      } else {
        mapCenter = { lat: 20.5937, lng: 78.9629 };
      }

      const hasSpecificLocation = Boolean(gpsLocation || selectedLocation);

      let zoomLevel: number;
      if (gpsLocation) {
        zoomLevel =
          accuracy !== null && accuracy <= 100 ? 18 : accuracy !== null && accuracy <= 500 ? 16 : 14;
      } else if (selectedLocation) {
        zoomLevel = 15;
      } else {
        zoomLevel = window.innerWidth < 768 ? 5 : 6;
      }

      const map = new mapsApi.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoomLevel,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: 'FIXLY_MAP',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      cleanupMapsApi = mapsApi;
      cleanupMap = map;

      if (!isActive) {
        return;
      }

      setMapContext({ map, mapsApi, mapCenter, hasSpecificLocation });
    };

    const timeoutId = window.setTimeout(() => {
      void initializeMap();
    }, 100);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      if (cleanupMapsApi && cleanupMap) {
        cleanupMapsApi.event.clearInstanceListeners(cleanupMap);
      }
      if (cleanupMapsApi && markerRef.current) {
        cleanupMapsApi.event.clearInstanceListeners(markerRef.current);
      }
      markerRef.current = null;
      setMapContext(null);
    };
  }, [accuracy, gpsLocation, isOpen, selectedLocation]);

  return { mapRef, markerRef, mapContext };
}
