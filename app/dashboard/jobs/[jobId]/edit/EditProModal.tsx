'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type EditProModalProps = {
  onClose: () => void;
};

export default function EditProModal({ onClose }: EditProModalProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-lg bg-white p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-fixly-text">Pro Feature Required</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="mb-3 text-fixly-text-muted">
            The ASAP urgency option is a Pro feature that helps you get faster responses from
            fixers.
          </p>

          <div className="mb-4 rounded-lg bg-fixly-accent/10 p-3">
            <h4 className="mb-2 font-medium text-fixly-text">Pro Benefits:</h4>
            <ul className="space-y-1 text-sm text-fixly-text-muted">
              <li>- ASAP job posting for urgent needs</li>
              <li>- Unlimited job posting</li>
              <li>- Job boosting for more visibility</li>
              <li>- Priority support</li>
              <li>- Advanced analytics</li>
            </ul>
          </div>
        </div>

        <div className="flex space-x-3">
          <button onClick={onClose} className="btn-ghost flex-1" type="button">
            Maybe Later
          </button>
          <button
            onClick={() => {
              onClose();
              router.push('/dashboard/subscription');
            }}
            className="btn-primary flex-1"
            type="button"
          >
            Upgrade to Pro
          </button>
        </div>
      </motion.div>
    </div>
  );
}
