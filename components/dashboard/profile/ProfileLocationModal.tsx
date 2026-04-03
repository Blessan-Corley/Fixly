'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { ProfileLocation } from '../../../types/profile';

const EnhancedLocationSelector = dynamic(
  () => import('../../../components/LocationPicker/EnhancedLocationSelector'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-fixly-border p-4 text-sm text-fixly-text-muted">
        Loading location selector...
      </div>
    ),
  }
);

export type ProfileLocationModalProps = {
  location: ProfileLocation | null;
  onClose: () => void;
  onLocationSelect: (selectedLocation: ProfileLocation | null) => void;
};

export default function ProfileLocationModal({
  location,
  onClose,
  onLocationSelect,
}: ProfileLocationModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-fixly-card p-4 md:p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-fixly-text">Select Your Location</h2>
            <p className="text-sm text-fixly-text-muted">
              Choose your location using GPS or search for an address
            </p>
          </div>
          <button onClick={onClose} className="text-fixly-text-muted hover:text-fixly-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <EnhancedLocationSelector
            onLocationSelect={onLocationSelect}
            initialLocation={location}
            showLabel={false}
            required={false}
            className="w-full"
          />
        </div>

        <div className="flex gap-3 border-t border-fixly-border pt-4">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
