'use client';

import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Send } from 'lucide-react';

type ApplyActionCardProps = {
  isAuthenticated: boolean;
  viewerRole?: string;
  hasApplied: boolean;
  jobStatus: string;
  onSignIn: () => void;
  onViewApplications: () => void;
  onOpenApplicationForm: () => void;
};

export function ApplyActionCard({
  isAuthenticated,
  viewerRole,
  hasApplied,
  jobStatus,
  onSignIn,
  onViewApplications,
  onOpenApplicationForm,
}: ApplyActionCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="card"
    >
      {!isAuthenticated ? (
        <div className="text-center">
          <p className="mb-4 text-fixly-text-light">Sign in to apply for this job</p>
          <button type="button" onClick={onSignIn} className="btn-primary w-full">
            Sign In to Apply
          </button>
        </div>
      ) : viewerRole !== 'fixer' ? (
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-orange-500" />
          <p className="text-fixly-text-light">Only fixers can apply to jobs</p>
        </div>
      ) : hasApplied ? (
        <div className="text-center">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
          <p className="mb-4 text-fixly-text-light">You have already applied to this job</p>
          <button type="button" onClick={onViewApplications} className="btn-ghost w-full">
            View My Applications
          </button>
        </div>
      ) : jobStatus !== 'open' ? (
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-orange-500" />
          <p className="text-fixly-text-light">This job is no longer accepting applications</p>
        </div>
      ) : (
        <button type="button" onClick={onOpenApplicationForm} className="btn-primary w-full">
          <Send className="mr-2 h-4 w-4" />
          Apply Now
        </button>
      )}
    </motion.div>
  );
}
