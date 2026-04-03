'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  X,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader,
  Navigation,
} from 'lucide-react';
import { type MouseEvent } from 'react';

import { env } from '@/lib/env';

import { isLocationRejected } from '../../utils/locationUtils';

import { type LocationPermissionProps, type LocationState } from './LocationPermission.utils';
import { useLocationPermission } from './useLocationPermission';

interface LocationBannerProps {
  locationState: LocationState;
  internalShowBanner: boolean;
  onOpenModal: () => void;
  onDismiss: () => void;
}

function LocationBanner({
  locationState,
  internalShowBanner,
  onOpenModal,
  onDismiss,
}: LocationBannerProps): React.JSX.Element | null {
  if (!internalShowBanner || locationState === 'granted') return null;

  const wasRejected = isLocationRejected();
  const bannerColor = wasRejected
    ? 'from-amber-50 to-orange-50'
    : 'from-fixly-accent/10 to-fixly-secondary/10';
  const borderColor = wasRejected ? 'border-amber-200' : 'border-blue-200';
  const iconBg = wasRejected ? 'bg-amber-100' : 'bg-blue-100';
  const iconColor = wasRejected ? 'text-amber-600' : 'text-blue-600';
  const textColor = wasRejected ? 'text-amber-900' : 'text-blue-900';
  const descColor = wasRejected ? 'text-amber-700' : 'text-blue-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${bannerColor} border ${borderColor} mb-6 rounded-lg p-4 shadow-sm`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start">
          <div
            className={`h-10 w-10 ${iconBg} mr-3 flex flex-shrink-0 items-center justify-center rounded-full`}
          >
            {wasRejected ? (
              <AlertCircle className={`h-5 w-5 ${iconColor}`} />
            ) : (
              <MapPin className={`h-5 w-5 ${iconColor}`} />
            )}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold ${textColor} mb-1 flex items-center`}>
              {wasRejected ? 'Location access was denied' : 'Find jobs near you'}
            </h4>
            <p className={`text-sm ${descColor} leading-relaxed`}>
              {wasRejected
                ? 'Nearby job matching is disabled. Enable location to sort jobs by distance.'
                : 'Enable location to see jobs sorted by distance and discover opportunities nearby.'}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center justify-between space-x-2 sm:justify-end">
          <button
            onClick={onOpenModal}
            className="btn-primary flex items-center whitespace-nowrap px-4 py-2 text-sm"
          >
            <Navigation className="mr-1 h-3 w-3" />
            <span className="hidden sm:inline">
              {wasRejected ? 'Try Again' : 'Enable Location'}
            </span>
            <span className="sm:hidden">{wasRejected ? 'Retry' : 'Enable'}</span>
          </button>
          <button
            onClick={onDismiss}
            className="rounded-full p-1 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
            aria-label="Close banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface LocationModalProps {
  showPermissionModal: boolean;
  error: string;
  loading: boolean;
  onClose: () => void;
  onDisable: () => Promise<void>;
  onRequest: () => Promise<void>;
}

function LocationModal({
  showPermissionModal,
  error,
  loading,
  onClose,
  onDisable,
  onRequest,
}: LocationModalProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {showPermissionModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md rounded-xl bg-white p-6"
            onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-fixly-text">Enable Location Services</h3>
              <p className="text-fixly-text-muted">
                Get jobs sorted by distance and discover opportunities in your area
              </p>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                See nearest jobs first
              </div>
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                Filter by distance from your location
              </div>
              <div className="flex items-center text-sm text-fixly-text">
                <CheckCircle className="mr-2 h-4 w-4 flex-shrink-0 text-green-500" />
                Reduce travel time to job sites
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start">
                  <AlertCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-start">
                <Settings className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                <div className="text-xs text-gray-600">
                  <p className="mb-1 font-medium">Privacy Notice</p>
                  <p>
                    Your location is stored locally for nearby matching and may be synced to your
                    account preferences when location sharing is enabled.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={onDisable} className="btn-ghost flex-1">
                Maybe Later
              </button>
              <button
                onClick={onRequest}
                disabled={loading}
                className="btn-primary flex flex-1 items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Enable Location
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LocationPermission({
  onLocationUpdate,
  showBanner = true,
  className = '',
}: LocationPermissionProps): React.JSX.Element {
  const {
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
  } = useLocationPermission(showBanner, onLocationUpdate);

  return (
    <div className={className}>
      <LocationBanner
        locationState={locationState}
        internalShowBanner={internalShowBanner}
        onOpenModal={() => setShowPermissionModal(true)}
        onDismiss={() => setInternalShowBanner(false)}
      />
      <LocationModal
        showPermissionModal={showPermissionModal}
        error={error}
        loading={loading}
        onClose={() => setShowPermissionModal(false)}
        onDisable={disableLocation}
        onRequest={requestLocation}
      />

      {env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 rounded bg-black px-2 py-1 text-xs text-white">
          Location: {locationState}{' '}
          {userLocation ? `(${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})` : ''}
        </div>
      )}
    </div>
  );
}
