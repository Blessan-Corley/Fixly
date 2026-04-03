'use client';

import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

type DisputeHelpCardProps = {
  onFileDispute: () => void;
};

export function DisputeHelpCard({ onFileDispute }: DisputeHelpCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 }}
      className="card"
    >
      <h3 className="mb-4 text-lg font-bold text-fixly-text">Need Help?</h3>
      <div className="space-y-3">
        <p className="text-sm text-fixly-text-light">
          Having issues with this job? Our dispute resolution system can help.
        </p>
        <button
          type="button"
          onClick={onFileDispute}
          className="btn-ghost flex w-full items-center justify-center"
        >
          <Scale className="mr-2 h-4 w-4" />
          File a Dispute
        </button>
      </div>
    </motion.div>
  );
}
