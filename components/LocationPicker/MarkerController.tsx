'use client';

import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

import type {
  Coordinates,
  GoogleMapInstance,
  GoogleMapsNamespace,
  GoogleMarkerInstance,
} from './location.types';

type MarkerControllerProps = {
  mapsApi: GoogleMapsNamespace;
  map: GoogleMapInstance;
  mapCenter: Coordinates;
  hasSpecificLocation: boolean;
  markerRef: MutableRefObject<GoogleMarkerInstance | null>;
  onPositionChange: (lat: number, lng: number) => Promise<void>;
};

export function MarkerController({
  mapsApi,
  map,
  mapCenter,
  hasSpecificLocation,
  markerRef,
  onPositionChange,
}: MarkerControllerProps): React.JSX.Element | null {
  useEffect(() => {
    let marker: GoogleMarkerInstance;

    const initializeMarker = async (): Promise<void> => {
      let markerRetries = 0;
      const maxMarkerRetries = 5;
      while (!mapsApi.marker?.AdvancedMarkerElement && markerRetries < maxMarkerRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        markerRetries += 1;
      }

      try {
        if (mapsApi.marker?.AdvancedMarkerElement) {
          const markerElement = document.createElement('div');
          markerElement.style.width = '40px';
          markerElement.style.height = '40px';
          markerElement.style.backgroundImage =
            'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMjAgM0MxNC40OCAzIDEwIDcuNDggMTAgMTNDMTAgMjIuMTcgMjAgMzcgMjAgMzdDMjAgMzcgMzAgMjIuMTcgMzAgMTNDMzAgNy40OCAyNS41MiAzIDIwIDNaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDxwYXRoIGQ9Ik0yMCA0QzE1LjAzIDQgMTEgOC4wMyAxMSAxM0MxMSAyMS41NCAyMCAzNSAyMCAzNUMyMCAzNSAyOSAyMS41NCAyOSAxM0MyOSA4LjAzIDI0Ljk3IDQgMjAgNFoiIGZpbGw9IiNFRjM0NDQiLz4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjEzIiByPSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)';
          markerElement.style.backgroundSize = 'contain';
          markerElement.style.backgroundRepeat = 'no-repeat';
          markerElement.style.cursor = 'pointer';
          markerElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
          markerElement.title = 'Drag to select location';

          marker = new mapsApi.marker.AdvancedMarkerElement({
            map,
            position: mapCenter,
            content: markerElement,
            gmpDraggable: true,
          });
        } else {
          marker = new mapsApi.Marker({
            position: mapCenter,
            map,
            draggable: true,
            title: 'Drag to select location',
            animation: hasSpecificLocation ? mapsApi.Animation.DROP : null,
            icon: {
              url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMjAgM0MxNC40OCAzIDEwIDcuNDggMTAgMTNDMTAgMjIuMTcgMjAgMzcgMjAgMzdDMjAgMzcgMzAgMjIuMTcgMzAgMTNDMzAgNy40OCAyNS41MiAzIDIwIDNaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDxwYXRoIGQ9Ik0yMCA0QzE1LjAzIDQgMTEgOC4wMyAxMSAxM0MxMSAyMS41NCAyMCAzNSAyMCAzNUMyMCAzNSAyOSAyMS41NCAyOSAxM0MyOSA4LjAzIDI0Ljk3IDQgMjAgNFoiIGZpbGw9IiNFRjM0NDQiLz4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjEzIiByPSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)',
              scaledSize: new mapsApi.Size(40, 40),
              anchor: new mapsApi.Point(20, 35),
            },
          });
        }
      } catch (error: unknown) {
        console.warn('Error creating advanced marker, using legacy marker:', error);
        marker = new mapsApi.Marker({
          position: mapCenter,
          map,
          draggable: true,
          title: 'Drag to select location',
          animation: hasSpecificLocation ? mapsApi.Animation.DROP : null,
        });
      }

      markerRef.current = marker;

      if (marker.gmpDraggable !== undefined) {
        marker.addListener('dragend', async () => {
          const position = marker.position;
          if (!position) {
            return;
          }
          await onPositionChange(position.lat, position.lng);
        });
      } else {
        marker.addListener('dragstart', () => {
          marker.setAnimation?.(null);
        });

        marker.addListener('dragend', async () => {
          const position = marker.getPosition?.();
          if (!position) {
            return;
          }

          marker.setAnimation?.(mapsApi.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation?.(null), 750);
          await onPositionChange(position.lat(), position.lng());
        });
      }

      map.addListener('click', async (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        if (marker.gmpDraggable !== undefined) {
          marker.position = { lat, lng };
        } else {
          marker.setPosition?.({ lat, lng });
          marker.setAnimation?.(mapsApi.Animation.DROP);
          setTimeout(() => marker.setAnimation?.(null), 750);
        }

        await onPositionChange(lat, lng);
      });
    };

    void initializeMarker();

    return () => {
      mapsApi.event.clearInstanceListeners(map);
      if (markerRef.current) {
        mapsApi.event.clearInstanceListeners(markerRef.current);
      }
      markerRef.current = null;
    };
  }, [hasSpecificLocation, map, mapCenter, mapsApi, markerRef, onPositionChange]);

  return null;
}
