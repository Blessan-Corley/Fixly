'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Map, RefreshCw } from 'lucide-react';

import { actionButtonMotion, GuidanceMessage } from './LocationSelectorHelpers';
import type { LocationGpsFailedStepProps, LocationGpsSuccessStepProps } from './LocationSelectorSteps';

export function LocationGpsSuccessStep({
  selectedLocation,
  confirmCurrentLocation,
  openMapModal,
  getCurrentLocation,
}: LocationGpsSuccessStepProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Location Found!</h3>
        {selectedLocation ? (
          <div className="mx-auto mt-3 max-w-md rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {selectedLocation.address}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <motion.button
          {...actionButtonMotion}
          onClick={confirmCurrentLocation}
          className="btn-primary flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
        >
          <CheckCircle className="h-5 w-5" />
          <span>Confirm Location</span>
        </motion.button>
        <motion.button
          {...actionButtonMotion}
          onClick={openMapModal}
          className="btn-secondary flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
        >
          <Map className="h-5 w-5" />
          <span>Use Maps</span>
        </motion.button>
        <motion.button
          {...actionButtonMotion}
          onClick={getCurrentLocation}
          className="btn-ghost flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
        >
          <RefreshCw className="h-5 w-5" />
          <span>Retry GPS</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export function LocationGpsFailedStep({
  selectedLocation,
  confirmCurrentLocation,
  openMapModal,
  getCurrentLocation,
  getLocationMessage,
  error,
}: LocationGpsFailedStepProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {selectedLocation?.address ? (
        <>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
              Location Found!
            </h3>
            <div className="mx-auto mt-3 max-w-md rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {selectedLocation.address}
              </p>
            </div>
            <GuidanceMessage message={getLocationMessage(true)} />
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <motion.button
              {...actionButtonMotion}
              onClick={confirmCurrentLocation}
              className="btn-primary flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Confirm Location</span>
            </motion.button>
            <motion.button
              {...actionButtonMotion}
              onClick={openMapModal}
              className="btn-secondary flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
            >
              <Map className="h-5 w-5" />
              <span>Use Maps</span>
            </motion.button>
            <motion.button
              {...actionButtonMotion}
              onClick={getCurrentLocation}
              className="btn-ghost flex transform items-center justify-center space-x-2 hover:-translate-y-0.5"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Retry GPS</span>
            </motion.button>
          </div>
        </>
      ) : (
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-orange-900">Unable to get location</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-orange-700">
            {error || 'Please try again or use map selection.'}
          </p>
          <div className="mt-4 flex items-center justify-center space-x-3">
            <button
              onClick={getCurrentLocation}
              className="btn-ghost flex items-center space-x-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
            <button onClick={openMapModal} className="btn-primary text-sm">
              Use Map Instead
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
