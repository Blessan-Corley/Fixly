'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { sanitizeIndianPhoneDigits } from '../../../lib/validations/profile';

export type ProfilePhoneEditModalProps = {
  newPhoneNumber: string;
  setNewPhoneNumber: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onUpdate: () => void | Promise<void>;
};

export default function ProfilePhoneEditModal({
  newPhoneNumber,
  setNewPhoneNumber,
  onClose,
  onUpdate,
}: ProfilePhoneEditModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-white p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-fixly-text">Update Phone Number</h3>
          <button onClick={onClose} className="text-fixly-text-muted hover:text-fixly-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-fixly-text">
              New Phone Number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="text-sm text-fixly-text-muted">+91</span>
              </div>
              <input
                type="tel"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(sanitizeIndianPhoneDigits(e.target.value))}
                placeholder="Enter 10-digit mobile number"
                className="w-full rounded-lg border border-fixly-border py-3 pl-16 pr-4 focus:border-fixly-accent focus:ring-2 focus:ring-fixly-accent"
                maxLength={10}
              />
            </div>
            <p className="mt-1 text-xs text-fixly-text-muted">
              You&apos;ll need to verify this number after updating
            </p>
          </div>

          <div className="flex gap-3 border-t border-fixly-border pt-4">
            <button onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={onUpdate}
              disabled={!newPhoneNumber || newPhoneNumber.length !== 10}
              className="btn-primary flex-1"
            >
              Update & Verify
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
