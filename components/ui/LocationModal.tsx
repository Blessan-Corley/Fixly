'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Settings, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { type MouseEvent } from 'react';

interface LocationModalProps {
  showPermissionModal: boolean;
  error: string;
  loading: boolean;
  onClose: () => void;
  onDisable: () => Promise<void>;
  onRequest: () => Promise<void>;
}

export function LocationModal({
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
