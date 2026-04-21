'use client';

import { motion } from 'framer-motion';
import { MapPin, X, AlertCircle, Navigation } from 'lucide-react';

import { isLocationRejected } from '../../utils/locationUtils';

import type { LocationState } from './LocationPermission.utils';

interface LocationBannerProps {
  locationState: LocationState;
  internalShowBanner: boolean;
  onOpenModal: () => void;
  onDismiss: () => void;
}

export function LocationBanner({
  locationState,
  internalShowBanner,
  onOpenModal,
  onDismiss,
}: LocationBannerProps): React.JSX.Element | null {
  if (!internalShowBanner || locationState === 'granted') return null;

  const wasRejected = isLocationRejected();
  const bannerColor = wasRejected ? 'from-amber-50 to-orange-50' : 'from-fixly-accent/10 to-fixly-secondary/10';
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
          <div className={`h-10 w-10 ${iconBg} mr-3 flex flex-shrink-0 items-center justify-center rounded-full`}>
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
            <span className="hidden sm:inline">{wasRejected ? 'Try Again' : 'Enable Location'}</span>
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
