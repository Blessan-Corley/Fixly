'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Shield, Star, Target, User } from 'lucide-react';

import { formatDate } from '../_lib/jobDetails.formatters';
import type { JobDetails } from '../_lib/jobDetails.types';

type ClientInformationCardProps = {
  job: JobDetails;
  viewerRole?: string;
  onMessageClient: () => void;
};

export function ClientInformationCard({
  job,
  viewerRole,
  onMessageClient,
}: ClientInformationCardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="card"
    >
      <h3 className="mb-4 text-lg font-bold text-fixly-text">Client Information</h3>
      <div className="mb-4 flex items-center">
        <div className="mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-fixly-accent-light">
          <User className="h-6 w-6 text-fixly-accent" />
        </div>
        <div>
          <p className="font-semibold text-fixly-text">{job.createdBy?.name || 'Anonymous'}</p>
          <div className="flex items-center">
            <Star className="mr-1 h-4 w-4 text-yellow-400" />
            <span className="text-sm text-fixly-text-light">
              {job.createdBy?.rating.average !== null && job.createdBy?.rating.average !== undefined
                ? job.createdBy.rating.average.toFixed(1)
                : 'No rating'}{' '}
              ({job.createdBy?.rating.count || 0} reviews)
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-fixly-text-light">
        <div className="flex items-center">
          <Shield className="mr-2 h-4 w-4" />
          <span>Verified Client</span>
        </div>
        <div className="flex items-center">
          <Target className="mr-2 h-4 w-4" />
          <span>Member since {formatDate(job.createdBy?.createdAt)}</span>
        </div>
      </div>

      {viewerRole === 'fixer' && job.createdBy?.id && (
        <div className="mt-4 border-t border-fixly-border pt-4">
          <button type="button" onClick={onMessageClient} className="btn-ghost w-full">
            <MessageCircle className="mr-2 h-4 w-4" />
            Message Client
          </button>
        </div>
      )}
    </motion.div>
  );
}
