'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Map, MapPin, Search, Target } from 'lucide-react';

import type { LocationMessage, LocationStep, SelectedLocation } from './location.types';
import { actionButtonMotion, GuidanceMessage, SelectedLocationSummary } from './LocationSelectorHelpers';

export type LocationStepSetter = (step: LocationStep) => void;

export type LocationInitialStepProps = {
  selectedLocation: SelectedLocation | null;
  isLoading: boolean;
  resetSelection: () => void;
  confirmCurrentLocation: () => void;
  getCurrentLocation: () => void;
  openMapModal: () => void;
  setCurrentStep: LocationStepSetter;
  getLocationMessage: (hasLocation?: boolean) => LocationMessage;
};

export type LocationGpsSuccessStepProps = {
  selectedLocation: SelectedLocation | null;
  confirmCurrentLocation: () => void;
  openMapModal: () => void;
  getCurrentLocation: () => void;
};

export type LocationGpsFailedStepProps = LocationGpsSuccessStepProps & {
  error: string;
  getLocationMessage: (hasLocation?: boolean) => LocationMessage;
};

export function LocationInitialStep({
  selectedLocation,
  isLoading,
  resetSelection,
  confirmCurrentLocation,
  getCurrentLocation,
  openMapModal,
  setCurrentStep,
  getLocationMessage,
}: LocationInitialStepProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {selectedLocation ? (
        <div className="space-y-4">
          <SelectedLocationSummary selectedLocation={selectedLocation} onReset={resetSelection} />
          <div className="flex items-center justify-center">
            <motion.button
              {...actionButtonMotion}
              onClick={confirmCurrentLocation}
              className="btn-primary flex items-center space-x-2 px-8 py-3"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Confirm This Location</span>
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fixly-primary/10">
            <MapPin className="h-8 w-8 text-fixly-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fixly-text dark:text-gray-200">
              Choose Your Location
            </h3>
            <p className="mt-1 text-sm text-fixly-text-muted">
              Select how you&apos;d like to set your location
            </p>
          </div>
          <GuidanceMessage message={getLocationMessage(false)} />
        </div>
      )}

      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <motion.button
          {...actionButtonMotion}
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="btn-primary flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
        >
          <Target className="h-5 w-5" />
          <span>Use GPS</span>
        </motion.button>
        <motion.button
          {...actionButtonMotion}
          onClick={openMapModal}
          className="btn-secondary flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
        >
          <Map className="h-5 w-5" />
          <span>Select on Map</span>
        </motion.button>
        <motion.button
          {...actionButtonMotion}
          onClick={() => setCurrentStep('address-search')}
          className="btn-ghost flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
        >
          <Search className="h-5 w-5" />
          <span>Search Address</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export function LocationGpsDetectingStep({
  setCurrentStep,
}: {
  setCurrentStep: LocationStepSetter;
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="py-8 text-center"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-fixly-text">Detecting Your Location</h3>
      <p className="mt-1 text-sm text-fixly-text-muted">Please allow location access when prompted</p>
      <button onClick={() => setCurrentStep('initial')} className="btn-ghost mt-4 text-sm">
        Cancel
      </button>
    </motion.div>
  );
}

export { LocationGpsSuccessStep, LocationGpsFailedStep } from './LocationSelectorStepsGps';
