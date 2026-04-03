'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Map, MapPin, Navigation, X } from 'lucide-react';

import type { Coordinates, SelectedLocation } from './location.types';
import { MarkerController } from './MarkerController';
import { useMapInitializer } from './useMapInitializer';

type MapLoaderProps = {
  isOpen: boolean;
  gpsLocation: Coordinates | null;
  accuracy: number | null;
  selectedLocation: SelectedLocation | null;
  onClose: () => void;
  onConfirm: () => void;
  onPositionChange: (lat: number, lng: number) => Promise<void>;
};

export function MapLoader({
  isOpen,
  gpsLocation,
  accuracy,
  selectedLocation,
  onClose,
  onConfirm,
  onPositionChange,
}: MapLoaderProps): React.JSX.Element {
  const { mapRef, markerRef, mapContext } = useMapInitializer(
    isOpen,
    gpsLocation,
    accuracy,
    selectedLocation,
  );

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-fixly-border p-6">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fixly-primary/10">
                  <Map className="h-5 w-5 text-fixly-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-fixly-text">Select Location on Map</h3>
                  <p className="text-sm text-fixly-text-muted">
                    Drag the marker or click to select your exact location
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-fixly-text-muted hover:bg-gray-100 hover:text-fixly-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <div ref={mapRef} className="h-[500px] w-full bg-gray-100" />
              {mapContext ? (
                <MarkerController
                  mapsApi={mapContext.mapsApi}
                  map={mapContext.map}
                  mapCenter={mapContext.mapCenter}
                  hasSpecificLocation={mapContext.hasSpecificLocation}
                  markerRef={markerRef}
                  onPositionChange={onPositionChange}
                />
              ) : null}

              <div className="absolute left-4 top-4 max-w-xs rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800">
                <div className="flex items-center space-x-2 text-sm text-fixly-text-muted dark:text-gray-300">
                  <Navigation className="h-4 w-4" />
                  <span>Click or drag marker to select location</span>
                </div>
              </div>

              <div className="absolute right-4 top-4">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-gray-600 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute bottom-4 right-4">
                <button
                  onClick={onConfirm}
                  disabled={!selectedLocation}
                  className="flex items-center space-x-2 rounded-lg bg-fixly-primary px-6 py-3 font-medium text-white shadow-lg transition-all hover:bg-fixly-primary-hover hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-300"
                  title="Confirm Location"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Confirm Location</span>
                </button>
              </div>
            </div>

            {selectedLocation ? (
              <div className="border-t border-fixly-border bg-fixly-bg p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-fixly-primary/10 p-2 dark:bg-fixly-primary/20">
                    <MapPin className="h-5 w-5 text-fixly-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="flex items-center font-medium text-fixly-text dark:text-white">
                      <span>Selected Location</span>
                    </h4>
                    <p className="mt-1 text-sm font-medium text-fixly-text-muted dark:text-gray-300">
                      {selectedLocation.address}
                    </p>
                    {selectedLocation.components?.city ? (
                      <div className="mt-2 flex items-center text-xs text-fixly-text-muted dark:text-gray-400">
                        <div className="mr-2 h-2 w-2 rounded-full bg-fixly-primary"></div>
                        {selectedLocation.components.city}
                        {selectedLocation.components.state
                          ? `, ${selectedLocation.components.state}`
                          : ''}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
