'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { PhoneVerificationResult, ProfileUser } from '../../../types/profile';

const FirebasePhoneAuth = dynamic(
  () => import('../../../components/auth/FirebasePhoneAuth'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-fixly-border p-4 text-sm text-fixly-text-muted">
        Loading phone verification...
      </div>
    ),
  }
);

export type ProfilePhoneVerificationModalProps = {
  user: ProfileUser | null;
  newPhoneNumber: string;
  onClose: () => void;
  onVerificationComplete: (result: PhoneVerificationResult) => void | Promise<void>;
  onVerificationError: (error: Error) => void;
};

export default function ProfilePhoneVerificationModal({
  user,
  newPhoneNumber,
  onClose,
  onVerificationComplete,
  onVerificationError,
}: ProfilePhoneVerificationModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-white p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-fixly-text">Verify Phone Number</h3>
          <button onClick={onClose} className="text-fixly-text-muted hover:text-fixly-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <FirebasePhoneAuth
          phoneNumber={newPhoneNumber || user?.phone || ''}
          onVerificationComplete={onVerificationComplete}
          onError={onVerificationError}
        />
      </motion.div>
    </div>
  );
}
