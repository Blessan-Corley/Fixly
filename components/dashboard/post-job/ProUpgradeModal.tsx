'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Star } from 'lucide-react';

type ProUpgradeModalProps = {
  onClose: () => void;
  onUpgrade: () => void;
};

export function ProUpgradeModal({ onClose, onUpgrade }: ProUpgradeModalProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl bg-fixly-card p-6"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fixly-accent/10">
            <Star className="h-8 w-8 text-fixly-accent" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-fixly-text">Unlock Pro Features</h3>
          <p className="text-fixly-text-muted">
            Get ASAP posting, unlimited jobs, and job boosting for just ₹49/month!
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center text-sm text-fixly-text">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Unlimited job posting (no 3-hour wait)
          </div>
          <div className="flex items-center text-sm text-fixly-text">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            ASAP feature for urgent jobs
          </div>
          <div className="flex items-center text-sm text-fixly-text">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Job boosting for better visibility
          </div>
          <div className="flex items-center text-sm text-fixly-text">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Priority support
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Maybe Later
          </button>
          <button type="button" onClick={onUpgrade} className="btn-primary flex-1">
            Upgrade Now
          </button>
        </div>
      </motion.div>
    </div>
  );
}
