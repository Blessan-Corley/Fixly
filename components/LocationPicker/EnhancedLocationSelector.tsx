'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

import type { EnhancedLocationSelectorProps } from './location.types';
import LocationPickerErrorBoundary from './LocationPickerErrorBoundary';
import {
  LocationGpsDetectingStep,
  LocationGpsFailedStep,
  LocationGpsSuccessStep,
  LocationInitialStep,
} from './LocationSelectorSteps';
import { MapLoader } from './MapLoader';
import { PlacesSearch } from './PlacesSearch';
import { useLocationPicker } from './useLocationPicker';

const EnhancedLocationSelector = ({
  onLocationSelect,
  initialLocation = null,
  showLabel = true,
  required = false,
  className = '',
}: EnhancedLocationSelectorProps): React.JSX.Element => {
  const {
    currentStep,
    selectedLocation,
    isLoading,
    showMapModal,
    error,
    gpsLocation,
    accuracy,
    autocompleteRef,
    setCurrentStep,
    clearError,
    getLocationMessage,
    getCurrentLocation,
    openMapModal,
    closeMapModal,
    confirmCurrentLocation,
    confirmMapSelection,
    resetSelection,
    reverseGeocode,
  } = useLocationPicker(onLocationSelect, initialLocation);

  return (
    <LocationPickerErrorBoundary onFallbackMode={() => setCurrentStep('address-search')}>
      <div className={`space-y-4 ${className}`}>
        {showLabel ? (
          <label className="mb-2 block text-sm font-medium text-fixly-text dark:text-gray-200">
            Select Location {required ? <span className="text-red-500">*</span> : null}
          </label>
        ) : null}

        <div className="space-y-4 rounded-xl border border-fixly-border bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
            >
              <div className="flex items-start space-x-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900 dark:text-red-100">
                    Service Area Limitation
                  </h4>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                  <div className="mt-3 rounded-lg bg-red-100 p-3 dark:bg-red-900/30">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      <strong>Why this restriction?</strong> Fixly currently provides services only
                      within India to ensure quality service delivery and compliance with local
                      regulations.
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearError}
                  className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ) : null}

          <AnimatePresence mode="wait">
            {currentStep === 'initial' ? (
              <LocationInitialStep
                selectedLocation={selectedLocation}
                isLoading={isLoading}
                resetSelection={resetSelection}
                confirmCurrentLocation={confirmCurrentLocation}
                getCurrentLocation={getCurrentLocation}
                openMapModal={openMapModal}
                setCurrentStep={setCurrentStep}
                getLocationMessage={getLocationMessage}
              />
            ) : null}
            {currentStep === 'gps-detecting' ? (
              <LocationGpsDetectingStep setCurrentStep={setCurrentStep} />
            ) : null}
            {currentStep === 'gps-success' ? (
              <LocationGpsSuccessStep
                selectedLocation={selectedLocation}
                confirmCurrentLocation={confirmCurrentLocation}
                openMapModal={openMapModal}
                getCurrentLocation={getCurrentLocation}
              />
            ) : null}
            {currentStep === 'gps-failed' ? (
              <LocationGpsFailedStep
                selectedLocation={selectedLocation}
                confirmCurrentLocation={confirmCurrentLocation}
                openMapModal={openMapModal}
                getCurrentLocation={getCurrentLocation}
                getLocationMessage={getLocationMessage}
                error={error}
              />
            ) : null}
            {currentStep === 'address-search' ? (
              <PlacesSearch
                autocompleteRef={autocompleteRef}
                onClose={() => setCurrentStep('initial')}
              />
            ) : null}
          </AnimatePresence>
        </div>

        <MapLoader
          isOpen={showMapModal}
          gpsLocation={gpsLocation}
          accuracy={accuracy}
          selectedLocation={selectedLocation}
          onClose={closeMapModal}
          onConfirm={confirmMapSelection}
          onPositionChange={reverseGeocode}
        />
      </div>
    </LocationPickerErrorBoundary>
  );
};

export default EnhancedLocationSelector;
